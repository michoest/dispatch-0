require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  openaiApiKey: process.env.OPENAI_API_KEY,
  dispatcherApiKey: process.env.DISPATCHER_API_KEY,
  llmModel: process.env.LLM_MODEL || 'gpt-4-turbo-preview',
  confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.7'),
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000'),
  dbPath: process.env.DB_PATH || './db.json'
};
