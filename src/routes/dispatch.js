const express = require('express');
const router = express.Router();
const { routeRequest } = require('../services/llmRouter');
const { dispatchToService } = require('../services/dispatcher');
const { getService } = require('../services/serviceRegistry');
const { validateTranscript } = require('../utils/validators');
const logger = require('../utils/logger');

router.post('/', async (req, res, next) => {
  try {
    const { transcript } = req.body;

    // Validate input
    if (!validateTranscript(transcript)) {
      return res.status(400).json({ error: 'Invalid or missing transcript' });
    }

    logger.info(`Received dispatch request: "${transcript}"`);

    // Route request using LLM
    const routingResult = await routeRequest(transcript);

    // Check confidence
    if (!routingResult.confident) {
      // Return options to user
      return res.json({
        status: 'uncertain',
        explanation: routingResult.explanation,
        options: routingResult.availableServices,
        message: 'I\'m not sure which service to use. Please clarify or select one.'
      });
    }

    // Dispatch to selected service
    const result = await dispatchToService(routingResult, transcript);

    res.json({
      status: 'success',
      service: result.service,
      url: result.url,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    next(error);
  }
});

// Manual service selection endpoint (when user clarifies)
router.post('/select', async (req, res, next) => {
  try {
    const { transcript, serviceId, endpointIndex } = req.body;

    // Build routing result manually
    const service = getService(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const endpoint = service.endpoints[endpointIndex];
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    const routingResult = {
      serviceId,
      selectedService: service.name,
      endpoint,
      parameters: {} // Could parse from transcript or ask user
    };

    const result = await dispatchToService(routingResult, transcript);

    res.json({
      status: 'success',
      service: result.service,
      url: result.url,
      message: result.message,
      data: result.data
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
