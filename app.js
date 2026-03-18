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
  };

  if (normalized.homeStationCodes.length === 0 || normalized.workStationCodes.length === 0) {
    throw new Error("Config arrays cannot be empty.");
  }

  return normalized;
}

function escapeForOdsql(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
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

function renderStationList(container, stationCodes, valuesByCode, kind) {
  container.innerHTML = "";

  for (const stationCode of stationCodes) {
    const record = valuesByCode.get(stationCode);
    const li = document.createElement("li");
    li.className = "station-item";

    const top = document.createElement("div");
    top.className = "station-top";

    const nameEl = document.createElement("span");
    nameEl.className = "station-name";
    nameEl.textContent = record ? `${record.name} (${record.stationcode})` : `Station ${stationCode}`;

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
      sub.textContent = "Station code not found in current feed response.";
    }

    top.append(nameEl, valueEl);
    li.append(top, sub);
    container.appendChild(li);
  }
}

function buildUrl(allStationCodes) {
  const whereParts = allStationCodes.map(
    (stationCode) => `stationcode = '${escapeForOdsql(stationCode)}'`
  );

  const params = new URLSearchParams({
    select: "name,stationcode,ebike,numdocksavailable,duedate",
    where: whereParts.join(" OR "),
    limit: String(Math.max(allStationCodes.length * 3, 20)),
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

  const allStationCodes = Array.from(
    new Set([...config.homeStationCodes, ...config.workStationCodes])
  );
  const url = buildUrl(allStationCodes);

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

    const byCode = new Map();
    for (const record of records) {
      if (record && typeof record.stationcode === "string") {
        byCode.set(record.stationcode, record);
      }
    }

    const homeTotalValue = config.homeStationCodes.reduce((sum, stationCode) => {
      const record = byCode.get(stationCode);
      return sum + (record ? Number(record.ebike || 0) : 0);
    }, 0);

    const workTotalValue = config.workStationCodes.reduce((sum, stationCode) => {
      const record = byCode.get(stationCode);
      return sum + (record ? Number(record.numdocksavailable || 0) : 0);
    }, 0);

    homeTotal.textContent = String(homeTotalValue);
    workTotal.textContent = String(workTotalValue);

    renderStationList(homeList, config.homeStationCodes, byCode, "home");
    renderStationList(workList, config.workStationCodes, byCode, "work");

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
