/**
 * Velib Backend Server
 * Aggregates official GBFS + optional app-derived bike data
 */

const http = require('http');
const url = require('url');

const config = require('./config');
const logger = require('./logger');
const { handleSummary } = require('./routes/summary');

/**
 * Simple request handler (no external dependencies)
 */
function requestHandler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', config.origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route handling
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  logger.debug(`${req.method} ${pathname}`);

  // Inject query into req for handlers
  req.query = query;

  if (pathname === '/api/summary' && req.method === 'GET') {
    handleSummary(req, res);
  } else if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
  } else if (pathname === '/' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ message: 'Velib Backend Server', version: '1.0.0' }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
}

/**
 * Start the server
 */
function start() {
  const server = http.createServer(requestHandler);

  server.listen(config.port, () => {
    logger.info(`Backend server listening on http://localhost:${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`App data extraction enabled: ${config.enableAppDataExtraction}`);
  });

  server.on('error', (error) => {
    logger.error('Server error:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

// Start if this is the main module
if (require.main === module) {
  start();
}

module.exports = { start, requestHandler };
