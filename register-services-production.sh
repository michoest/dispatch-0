#!/bin/bash

# Service registration script for production deployment
# Uses ports from ecosystem.config.js (3100-3103)

# Wait for services to start up
echo "Waiting for services to start..."
sleep 3

API_KEY="${DISPATCHER_API_KEY:-your-secure-dispatcher-api-key}"
DISPATCHER_PORT="${PORT:-3100}"

echo "Registering services with dispatcher on port $DISPATCHER_PORT..."
echo ""

echo "Registering calendar service (port 3101)..."
curl -X POST http://localhost:$DISPATCHER_PORT/api/services/register \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "http://localhost:3101", "apiKey": "calendar-secret-key"}'

echo ""
echo ""

echo "Registering reminder service (port 3102)..."
curl -X POST http://localhost:$DISPATCHER_PORT/api/services/register \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "http://localhost:3102", "apiKey": "reminder-secret-key"}'

echo ""
echo ""

echo "Registering weather service (port 3103)..."
curl -X POST http://localhost:$DISPATCHER_PORT/api/services/register \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "http://localhost:3103", "apiKey": "weather-secret-key"}'

echo ""
echo ""
echo "All services registered!"
echo ""
echo "Checking registered services:"
curl -s http://localhost:$DISPATCHER_PORT/api/services \
  -H "x-api-key: $API_KEY" | python3 -m json.tool 2>/dev/null || echo "Could not format JSON"

echo ""
