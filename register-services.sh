#!/bin/bash

# Wait for services to start up
echo "Waiting for services to start..."
sleep 3

API_KEY="${DISPATCHER_API_KEY:-your-secure-dispatcher-api-key}"

echo "Registering calendar service..."
curl -X POST http://localhost:3000/api/services/register \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "http://localhost:3001", "apiKey": "calendar-secret-key"}' \
  2>/dev/null

echo ""
echo "Registering reminder service..."
curl -X POST http://localhost:3000/api/services/register \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "http://localhost:3002", "apiKey": "reminder-secret-key"}' \
  2>/dev/null

echo ""
echo "Registering weather service..."
curl -X POST http://localhost:3000/api/services/register \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "http://localhost:3003", "apiKey": "weather-secret-key"}' \
  2>/dev/null

echo ""
echo "All services registered!"
echo ""
echo "Checking registered services:"
curl -s http://localhost:3000/api/services \
  -H "x-api-key: $API_KEY" | python3 -m json.tool 2>/dev/null || echo "Could not format JSON"
