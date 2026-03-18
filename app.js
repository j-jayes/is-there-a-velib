const DATASET_ENDPOINT =
  "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/velib-disponibilite-en-temps-reel/records";

const refreshBtn = document.getElementById("refreshBtn");
const statusText = document.getElementById("statusText");
const errorText = document.getElementById("errorText");
const homeTotal = document.getElementById("homeTotal");
const workTotal = document.getElementById("workTotal");
const homeList = document.getElementById("homeList");
const workList = document.getElementById("workList");

let isLoading = false;

function getConfig() {
  const cfg = window.VELIB_CONFIG;

  if (!cfg || typeof cfg !== "object") {
    throw new Error(
      "Missing config. Copy config.sample.js to config.js and set homeStationCodes/workStationCodes."
    );
  }

  if (!Array.isArray(cfg.homeStationCodes) || !Array.isArray(cfg.workStationCodes)) {
    throw new Error("Config must contain homeStationCodes and workStationCodes arrays.");
  }

  const normalized = {
    homeStationCodes: cfg.homeStationCodes.map((s) => String(s).trim()).filter(Boolean),
    workStationCodes: cfg.workStationCodes.map((s) => String(s).trim()).filter(Boolean),
    backendUrl: cfg.backendUrl || null,
    forceOfficalOnly: cfg.forceOfficalOnly || false,
  };

  if (normalized.homeStationCodes.length === 0 || normalized.workStationCodes.length === 0) {
    throw new Error("Config arrays cannot be empty.");
  }

  return normalized;
}

function escapeForOdsql(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function buildGbfsUrl(allStationCodes) {
  const whereParts = allStationCodes.map(
    (stationCode) => `stationcode = '${escapeForOdsql(stationCode)}'`
  );

  const params = new URLSearchParams({
    select: "name,stationcode,ebike,mechanical,numdocksavailable,duedate,capacity",
    where: whereParts.join(" OR "),
    limit: String(Math.max(allStationCodes.length * 3, 20)),
  });

  return `${DATASET_ENDPOINT}?${params.toString()}`;
}

function buildBackendUrl(config, allStationCodes) {
  if (!config.backendUrl || config.forceOfficalOnly) {
    return null;
  }
  const params = new URLSearchParams({
    stations: allStationCodes.join(","),
  });
  return `${config.backendUrl}/api/summary?${params.toString()}`;
}

function formatTime(value) {
  if (!value) {
    return "No timestamp";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown update time";
  }

  return date.toLocaleString();
}

function setLoading(loading) {
  isLoading = loading;
  refreshBtn.disabled = loading;
  refreshBtn.textContent = loading ? "Refreshing..." : "Refresh now";
}

function setStatus(message) {
  statusText.textContent = message;
}

function showError(message) {
  errorText.hidden = false;
  errorText.textContent = message;
}

function clearError() {
  errorText.hidden = true;
  errorText.textContent = "";
}

function renderStationList(container, stationCodes, stations, kind) {
  container.innerHTML = "";

  for (const stationCode of stationCodes) {
    const station = stations.find((s) => String(s.stationId) === String(stationCode));
    const li = document.createElement("li");
    li.className = "station-item";

    const top = document.createElement("div");
    top.className = "station-top";

    const nameEl = document.createElement("span");
    nameEl.className = "station-name";
    nameEl.textContent = station ? `${station.name} (${station.stationId})` : `Station ${stationCode}`;

    const valueEl = document.createElement("span");
    valueEl.className = "station-value";

    const sub = document.createElement("p");
    sub.className = "station-sub";

    if (station) {
      const value = kind === "home" ? station.electric.available : station.docks.available;
      valueEl.textContent = String(value ?? 0);
      sub.textContent = `Updated ${formatTime(station.lastUpdate)}`;
    } else {
      valueEl.textContent = "N/A";
      sub.textContent = "Station code not found in current data.";
    }

    top.append(nameEl, valueEl);
    li.append(top, sub);
    container.appendChild(li);
  }
}

async function fetchAndRender() {
  if (isLoading) {
    return;
  }

  let config;

  try {
    config = getConfig();
  } catch (error) {
    showError(error.message);
    setStatus("Cannot fetch data until config is fixed.");
    return;
  }

  clearError();
  setLoading(true);
  setStatus("Fetching latest Velib data...");

  const allStationCodes = Array.from(
    new Set([...config.homeStationCodes, ...config.workStationCodes])
  );

  try {
    let stations;

    // Try backend first if configured
    const backendUrl = buildBackendUrl(config, allStationCodes);
    if (backendUrl) {
      try {
        setStatus("Fetching from backend...");
        const response = await fetch(backendUrl, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`);
        }

        const payload = await response.json();
        stations = payload.stations || [];

        if (stations.length > 0) {
          setStatus(`Last refresh: ${new Date().toLocaleString()} (via backend)`);
          clearError();
        } else {
          throw new Error("Backend returned empty station list");
        }
      } catch (backendError) {
        console.warn("Backend fetch failed, falling back to direct GBFS:", backendError);
        // Fall through to direct GBFS fetch
        stations = null;
      }
    }

    // Fall back to direct GBFS if backend didn't work
    if (!stations) {
      setStatus("Fetching from official GBFS API...");
      const gbfsUrl = buildGbfsUrl(allStationCodes);
      const response = await fetch(gbfsUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from GBFS API`);
      }

      const payload = await response.json();
      const records = Array.isArray(payload.results) ? payload.results : [];

      // Convert GBFS records to normalized station format
      stations = records.map((record) => ({
        stationId: record.stationcode,
        name: record.name,
        mechanical: {
          available: record.mechanical || 0,
          total: record.capacity || 0,
          source: "official",
        },
        electric: {
          available: record.ebike || 0,
          total: record.capacity || 0,
          source: "official",
        },
        docks: {
          available: record.numdocksavailable || 0,
          total: record.capacity || 0,
          source: "official",
        },
        lastUpdate: record.duedate || new Date().toISOString(),
        threeStarBikes: null,
      }));

      setStatus(`Last refresh: ${new Date().toLocaleString()} (direct GBFS)`);
      clearError();
    }

    const homeTotalValue = config.homeStationCodes.reduce((sum, stationCode) => {
      const station = stations.find((s) => String(s.stationId) === String(stationCode));
      return sum + (station ? Number(station.electric.available || 0) : 0);
    }, 0);

    const workTotalValue = config.workStationCodes.reduce((sum, stationCode) => {
      const station = stations.find((s) => String(s.stationId) === String(stationCode));
      return sum + (station ? Number(station.docks.available || 0) : 0);
    }, 0);

    homeTotal.textContent = String(homeTotalValue);
    workTotal.textContent = String(workTotalValue);

    renderStationList(homeList, config.homeStationCodes, stations, "home");
    renderStationList(workList, config.workStationCodes, stations, "work");
  } catch (error) {
    showError(`Refresh failed: ${error.message}`);
    setStatus("Showing last successful values if available.");
  } finally {
    setLoading(false);
  }
}

refreshBtn.addEventListener("click", () => {
  fetchAndRender();
});

fetchAndRender();
