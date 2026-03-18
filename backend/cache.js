/**
 * Simple in-memory cache with TTL
 * Not suitable for distributed deployments; use Redis for production
 */

const cache = new Map();

/**
 * Get value from cache if not expired
 * @param {string} key
 * @returns {any|null}
 */
function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set value in cache with TTL
 * @param {string} key
 * @param {any} data
 * @param {number} ttlMs - Time to live in milliseconds
 */
function set(key, data, ttlMs) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
}

/**
 * Clear entire cache
 */
function clear() {
  cache.clear();
}

/**
 * Get cache stats (for debugging)
 */
function stats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

module.exports = {
  get,
  set,
  clear,
  stats,
};
