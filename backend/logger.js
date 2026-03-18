/**
 * Simple Logger
 */

const config = require('./config');

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[config.logLevel] || LOG_LEVELS.info;

function log(level, message, ...args) {
  if (LOG_LEVELS[level] >= currentLevel) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}]`, message, ...args);
  }
}

module.exports = {
  debug: (msg, ...args) => log('debug', msg, ...args),
  info: (msg, ...args) => log('info', msg, ...args),
  warn: (msg, ...args) => log('warn', msg, ...args),
  error: (msg, ...args) => log('error', msg, ...args),
};
