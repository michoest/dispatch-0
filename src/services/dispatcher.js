const axios = require('axios');
const { getService } = require('./serviceRegistry');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../db/database');
const logger = require('../utils/logger');

async function dispatchToService(routingResult, transcript) {
  const db = getDatabase();
  const service = getService(routingResult.serviceId);

  if (!service) {
    throw new Error('Service not found');
  }

  const url = `${service.baseUrl}${routingResult.endpoint.path}`;
  const method = routingResult.endpoint.method.toLowerCase();

  logger.info(`Dispatching to ${service.name}: ${method.toUpperCase()} ${url}`);

  try {
    const response = await axios({
      method,
      url,
      data: method !== 'get' ? routingResult.parameters : undefined,
      params: method === 'get' ? routingResult.parameters : undefined,
      headers: {
        'x-api-key': service.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    // Log request
    const requestLog = {
      id: uuidv4(),
      transcript,
      selectedService: service.name,
      endpoint: routingResult.endpoint,
      arguments: routingResult.parameters,
      confidence: 1.0,
      timestamp: new Date().toISOString(),
      result: 'success',
      callbackUrl: response.data.url || null,
      response: response.data
    };

    db.data.requests.push(requestLog);
    await db.write();

    return {
      success: true,
      service: service.name,
      url: response.data.url || null,
      message: response.data.message || 'Success',
      data: response.data
    };

  } catch (error) {
    logger.error(`Failed to dispatch to ${service.name}:`, error.message);

    // Log failed request
    const requestLog = {
      id: uuidv4(),
      transcript,
      selectedService: service.name,
      endpoint: routingResult.endpoint,
      arguments: routingResult.parameters,
      confidence: 1.0,
      timestamp: new Date().toISOString(),
      result: 'error',
      callbackUrl: null,
      error: error.message
    };

    db.data.requests.push(requestLog);
    await db.write();

    throw error;
  }
}

module.exports = { dispatchToService };
