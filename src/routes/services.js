const express = require('express');
const router = express.Router();
const {
  registerService,
  unregisterService,
  listServices,
  getService
} = require('../services/serviceRegistry');
const { validateServiceRegistration } = require('../utils/validators');

// List all services
router.get('/', (req, res) => {
  const services = listServices();
  res.json({ services });
});

// Get specific service
router.get('/:serviceId', (req, res) => {
  const service = getService(req.params.serviceId);

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  res.json({ service });
});

// Register new service
router.post('/register', async (req, res, next) => {
  try {
    const { baseUrl, apiKey } = req.body;

    if (!validateServiceRegistration(baseUrl, apiKey)) {
      return res.status(400).json({ error: 'Invalid baseUrl or apiKey' });
    }

    const service = await registerService(baseUrl, apiKey);
    res.status(201).json({ service });

  } catch (error) {
    next(error);
  }
});

// Unregister service
router.delete('/:serviceId', async (req, res, next) => {
  try {
    const service = await unregisterService(req.params.serviceId);
    res.json({ message: 'Service unregistered', service });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
