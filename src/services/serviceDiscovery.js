const axios = require('axios');
const { getDatabase } = require('../db/database');
const config = require('../config/config');
const logger = require('../utils/logger');

let healthCheckTimer;

async function performHealthCheck(service) {
  try {
    const response = await axios.get(`${service.baseUrl}/dispatch/health`, {
      timeout: 3000
    });

    if (response.status === 200) {
      return { healthy: true, lastCheck: new Date().toISOString() };
    }
    return { healthy: false, lastCheck: new Date().toISOString() };

  } catch (error) {
    logger.warn(`Health check failed for ${service.name}: ${error.message}`);
    return { healthy: false, lastCheck: new Date().toISOString() };
  }
}

async function updateServiceHealth() {
  const db = getDatabase();

  for (const service of db.data.services) {
    const health = await performHealthCheck(service);
    service.lastHealthCheck = health.lastCheck;
    service.status = health.healthy ? 'healthy' : 'unhealthy';
  }

  await db.write();
}

function startHealthCheckScheduler() {
  logger.info('Starting health check scheduler');

  // Perform initial health check
  updateServiceHealth();

  // Schedule periodic health checks
  healthCheckTimer = setInterval(
    updateServiceHealth,
    config.healthCheckInterval
  );
}

function stopHealthCheckScheduler() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    logger.info('Health check scheduler stopped');
  }
}

module.exports = {
  performHealthCheck,
  startHealthCheckScheduler,
  stopHealthCheckScheduler
};
