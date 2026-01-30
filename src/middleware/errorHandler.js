const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Error occurred:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'OpenAIError') {
    return res.status(502).json({ error: 'LLM service error', details: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler };
