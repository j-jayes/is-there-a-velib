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
      "Missing config. Copy config.sample.js to config.js and set homeStations/workStations."
    );
  }

  if (!Array.isArray(cfg.homeStations) || !Array.isArray(cfg.workStations)) {
    throw new Error("Config must contain homeStations and workStations arrays.");
  }

  const normalized = {
    homeStations: cfg.homeStations.map((s) => String(s).trim()).filter(Boolean),
    workStations: cfg.workStations.map((s) => String(s).trim()).filter(Boolean),
  };

  if (normalized.homeStations.length === 0 || normalized.workStations.length === 0) {
    throw new Error("Config arrays cannot be empty.");
  }

  return normalized;
}

function escapeForOdsql(value) {
  return value.replace(/'/g, "''");
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

function renderStationList(container, stations, valuesByName, kind) {
  container.innerHTML = "";

  for (const stationName of stations) {
    const record = valuesByName.get(stationName);
    const li = document.createElement("li");
    li.className = "station-item";

    const top = document.createElement("div");
    top.className = "station-top";

    const nameEl = document.createElement("span");
    nameEl.className = "station-name";
    nameEl.textContent = stationName;

    const valueEl = document.createElement("span");
    valueEl.className = "station-value";

    const sub = document.createElement("p");
    sub.className = "station-sub";

    if (record) {
      const value = kind === "home" ? record.ebike : record.numdocksavailable;
      valueEl.textContent = String(value ?? 0);
      sub.textContent = `Updated ${formatTime(record.duedate)}`;
    } else {
      valueEl.textContent = "N/A";
      sub.textContent = "Station not found in current feed response.";
    }

    top.append(nameEl, valueEl);
    li.append(top, sub);
    container.appendChild(li);
  }
}

function buildUrl(allStations) {
  const whereParts = allStations.map((name) => `name = '${escapeForOdsql(name)}'`);

  const params = new URLSearchParams({
    select: "name,stationcode,ebike,numdocksavailable,duedate",
    where: whereParts.join(" OR "),
    limit: String(Math.max(allStations.length * 3, 20)),
  });

  return `${DATASET_ENDPOINT}?${params.toString()}`;
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

  const allStations = Array.from(new Set([...config.homeStations, ...config.workStations]));
  const url = buildUrl(allStations);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from data source.`);
    }

    const payload = await response.json();
    const records = Array.isArray(payload.results) ? payload.results : [];

    const byName = new Map();
    for (const record of records) {
      if (record && typeof record.name === "string") {
        byName.set(record.name, record);
      }
    }

    const homeTotalValue = config.homeStations.reduce((sum, stationName) => {
      const record = byName.get(stationName);
      return sum + (record ? Number(record.ebike || 0) : 0);
    }, 0);

    const workTotalValue = config.workStations.reduce((sum, stationName) => {
      const record = byName.get(stationName);
      return sum + (record ? Number(record.numdocksavailable || 0) : 0);
    }, 0);

    homeTotal.textContent = String(homeTotalValue);
    workTotal.textContent = String(workTotalValue);

    renderStationList(homeList, config.homeStations, byName, "home");
    renderStationList(workList, config.workStations, byName, "work");

    setStatus(`Last refresh: ${new Date().toLocaleString()}`);
    clearError();
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
