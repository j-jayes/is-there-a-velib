/**
 * GET /api/summary
 * Returns aggregated station data (official + optional app-derived)
 */

const officialAdapter = require('../adapters/official');
const aggregator = require('../aggregator');
const logger = require('../logger');

/**
 * Helper to send JSON response
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Handle GET /api/summary?stations=12345,67890
 */
async function handleSummary(req, res) {
  try {
    const stationsParam = req.query.stations;

    if (!stationsParam) {
      return sendJson(res, 400, {
        error: 'Missing query parameter: stations (comma-separated IDs)',
      });
    }

    const stationIds = stationsParam
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (stationIds.length === 0) {
      return sendJson(res, 400, { error: 'No valid station IDs provided' });
    }

    logger.info(`Fetching data for ${stationIds.length} stations: ${stationIds.join(', ')}`);

    // Fetch official data (required)
    const officialStations = await officialAdapter.fetchStations(stationIds);

    if (officialStations.length === 0) {
      return sendJson(res, 404, {
        error: 'No station data found',
        stations: [],
      });
    }

    // TODO: Fetch app-derived data (Stage 3c, pending Phase 2 results)
    // For now, skip app data

    // Build response
    const responseData = aggregator.buildResponse(officialStations, {
      officialFreshness: '1m',
      appEnabled: false,
      fallbackMode: false,
    });

    return sendJson(res, 200, responseData);
  } catch (error) {
    logger.error('Error in /api/summary handler:', error.message);
    return sendJson(res, 500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
}

module.exports = {
  handleSummary,
};
