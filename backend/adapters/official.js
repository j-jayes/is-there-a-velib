/**
 * Official GBFS Adapter
 * Fetches station data from Velib's public OpenData GBFS endpoint
 */

const config = require('../config');
const cache = require('../cache');

const logger = require('../logger');

/**
 * Fetch station data from GBFS
 * @param {number|string} stationId
 * @returns {Promise<Object>}
 */
async function fetchStation(stationId) {
  const cacheKey = `station_official_${stationId}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug(`Cache hit for station ${stationId} (official)`);
    return cached;
  }

  logger.info(`Fetching official data for station ${stationId} from GBFS`);

  try {
    const url = new URL(config.gbfsUrl);
    url.searchParams.set('where', `stationcode='${stationId}'`);
    url.searchParams.set('select', 'stationcode,name,mechanical,ebike,numbikesavailable,numdocksavailable,capacity,duedate');
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), {
      timeout: 5000,
      headers: {
        'User-Agent': 'is-there-a-velib/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`GBFS API returned ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();

    if (!json.results || json.results.length === 0) {
      logger.warn(`No GBFS data found for station ${stationId}`);
      return null;
    }

    const record = json.results[0];
    const data = parseGbfsRecord(record);

    // Cache for TTL
    cache.set(cacheKey, data, config.officialCacheTtlMs);

    return data;
  } catch (error) {
    logger.error(`Error fetching official data for station ${stationId}:`, error.message);
    throw error;
  }
}

/**
 * Parse a GBFS record into normalized format
 * @param {Object} record
 * @returns {Object}
 */
function parseGbfsRecord(record) {
  // GBFS field mapping from Paris OpenData
  // 'mechanical' = available mechanical bikes
  // 'ebike' = available electric bikes
  // 'numbikesavailable' = mechanical + ebike
  // 'numdocksavailable' = available docks
  // 'capacity' = total capacity of the station
  
  return {
    stationId: record.stationcode,
    name: record.name,
    mechanical: {
      available: record.mechanical || 0,
      total: record.capacity || 0, // Best approximation
      source: 'official',
    },
    electric: {
      available: record.ebike || 0,
      total: record.capacity || 0, // Total capacity
      source: 'official',
    },
    docks: {
      available: record.numdocksavailable || 0,
      total: record.capacity || 0,
      source: 'official',
    },
    lastUpdate: record.duedate || new Date().toISOString(),
    threeStarBikes: null, // Will be populated by app adapter if enabled
  };
}

/**
 * Fetch multiple stations in parallel
 * @param {number[]|string[]} stationIds
 * @returns {Promise<Object[]>}
 */
async function fetchStations(stationIds) {
  const promises = stationIds.map((id) => fetchStation(id).catch((error) => {
    logger.warn(`Failed to fetch station ${id}:`, error.message);
    return null;
  }));

  const results = await Promise.all(promises);
  return results.filter((r) => r !== null);
}

module.exports = {
  fetchStation,
  fetchStations,
  parseGbfsRecord,
};
