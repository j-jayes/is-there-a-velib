/**
 * Backend Configuration
 * Environment variables override defaults
 */

module.exports = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080',

  // Official GBFS
  gbfsUrl: process.env.GBFS_URL || 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/velib-disponibilite-en-temps-reel/records',
  gbfsSelectFields: 'name,stationcode,debit,numdocksavailable,duedate',
  officialCacheTtlMs: parseInt(process.env.OFFICIAL_CACHE_TTL_MS, 10) || 60000, // 1 min

  // App-derived data (feature-flagged, requires Phase 2 results)
  enableAppDataExtraction: process.env.VELIB_ENABLE_APP_EXTRACTION === 'true',
  appApiEndpoint: process.env.VELIB_APP_API_ENDPOINT || null,
  appApiTimeout: parseInt(process.env.VELIB_APP_API_TIMEOUT_MS, 10) || 5000,
  appCacheTtlMs: parseInt(process.env.APP_CACHE_TTL_MS, 10) || 300000, // 5 min

  // Monitoring & Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  metricsEnabled: process.env.METRICS_ENABLED !== 'false',
};
