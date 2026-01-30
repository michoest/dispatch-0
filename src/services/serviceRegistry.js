const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../db/database');
const axios = require('axios');
const logger = require('../utils/logger');

async function registerService(baseUrl, apiKey) {
  const db = getDatabase();

  // Fetch service documentation
  try {
    const response = await axios.get(`${baseUrl}/dispatch/docs`, {
      headers: { 'x-api-key': apiKey },
      timeout: 5000
    });

    const serviceDoc = response.data;

    // Validate service doc structure
    if (!serviceDoc.name || !serviceDoc.description || !serviceDoc.endpoints) {
      throw new Error('Invalid service documentation format');
    }

    // Check if service already registered
    const existingService = db.data.services.find(s => s.name === serviceDoc.name);
    if (existingService) {
      throw new Error(`Service ${serviceDoc.name} already registered`);
    }

    const service = {
      id: uuidv4(),
      name: serviceDoc.name,
      description: serviceDoc.description,
      baseUrl,
      apiKey,
      endpoints: serviceDoc.endpoints,
      registeredAt: new Date().toISOString(),
      lastHealthCheck: new Date().toISOString(),
      status: 'healthy'
    };

    db.data.services.push(service);
    await db.write();

    logger.info(`Service registered: ${service.name}`);
    return service;

  } catch (error) {
    logger.error(`Failed to register service from ${baseUrl}:`, error.message);
    throw error;
  }
}

async function unregisterService(serviceId) {
  const db = getDatabase();
  const index = db.data.services.findIndex(s => s.id === serviceId);

  if (index === -1) {
    throw new Error('Service not found');
  }

  const service = db.data.services[index];
  db.data.services.splice(index, 1);
  await db.write();

  logger.info(`Service unregistered: ${service.name}`);
  return service;
}

function listServices() {
  const db = getDatabase();
  return db.data.services;
}

function getService(serviceId) {
  const db = getDatabase();
  return db.data.services.find(s => s.id === serviceId);
}

module.exports = {
  registerService,
  unregisterService,
  listServices,
  getService
};
