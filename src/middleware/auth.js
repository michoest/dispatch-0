const config = require('../config/config');
const logger = require('../utils/logger');

function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    logger.warn('Missing API key in request');
    return res.status(401).json({ error: 'API key required' });
  }

  if (apiKey !== config.dispatcherApiKey) {
    logger.warn('Invalid API key provided');
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
}

module.exports = { authMiddleware };
