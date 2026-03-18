/**
 * Data Aggregator
 * Merges official GBFS data with optional app-derived data
 */

const logger = require('./logger');

/**
 * Merge official and app-derived station data
 * @param {Object} officialData - From GBFS adapter
 * @param {Object|null} appData - From app adapter (optional)
 * @returns {Object} - Merged response
 */
function mergeStationData(officialData, appData = null) {
  if (!officialData) {
    return null;
  }

  const merged = { ...officialData };

  if (appData && appData.threeStarBikes) {
    merged.threeStarBikes = appData.threeStarBikes;
  }

  return merged;
}

/**
 * Build final API response
 * @param {Object[]} stations - Merged station data
 * @param {Object} meta - Metadata about data freshness and sources
 * @returns {Object}
 */
function buildResponse(stations, meta = {}) {
  return {
    timestamp: new Date().toISOString(),
    stations: stations || [],
    meta: {
      official_data_freshness: meta.officialFreshness || 'unknown',
      app_data_freshness: meta.appFreshness || 'unknown',
      app_data_enabled: meta.appEnabled || false,
      fallback_mode: meta.fallbackMode || false,
      ...meta.custom,
    },
  };
}

module.exports = {
  mergeStationData,
  buildResponse,
};
