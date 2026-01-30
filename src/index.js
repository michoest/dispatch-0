const express = require('express');
const config = require('./config/config');
const { authMiddleware } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const dispatchRoutes = require('./routes/dispatch');
const serviceRoutes = require('./routes/services');
const { initDatabase } = require('./db/database');
const { startHealthCheckScheduler } = require('./services/serviceDiscovery');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/dispatch', authMiddleware, dispatchRoutes);
app.use('/api/services', authMiddleware, serviceRoutes);

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Initialize
async function start() {
  await initDatabase();
  startHealthCheckScheduler();

  app.listen(config.port, () => {
    logger.info(`Dispatcher server running on port ${config.port}`);
  });
}

start().catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
