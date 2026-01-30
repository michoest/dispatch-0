# Voice-to-Service Dispatcher

A Node.js/Express server that receives voice transcripts from Siri shortcuts, uses OpenAI LLM to route requests to registered services, and returns URLs for Siri to open.

## Architecture

- **Dispatcher Server**: Main server that handles routing (port 3000)
- **Dummy Services**: Three example services (calendar, reminder, weather)
- **LLM Router**: Uses OpenAI function calling to select services
- **Service Registry**: Dynamic service registration via `/dispatch/docs` endpoint

## Quick Start

```bash
# 1. Add your OpenAI API key to .env
# Edit .env and set OPENAI_API_KEY=sk-your-key

# 2. Start all services
npm run start:all

# 3. In a new terminal, register services
./register-services.sh

# 4. Test it
curl -X POST http://localhost:3000/api/dispatch \
  -H "x-api-key: your-secure-dispatcher-api-key" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Schedule a meeting tomorrow at 2pm"}'
```

## Prerequisites

- Node.js (v16 or higher)
- OpenAI API key
- (Optional) ngrok or server for Siri integration

## Setup

### 1. Configure Environment

Edit `.env` and add your OpenAI API key:

```env
PORT=3000
OPENAI_API_KEY=sk-your-actual-openai-key-here
DISPATCHER_API_KEY=your-secure-dispatcher-api-key
LLM_MODEL=gpt-4-turbo-preview
CONFIDENCE_THRESHOLD=0.7
HEALTH_CHECK_INTERVAL=60000
DB_PATH=./db.json
LOG_LEVEL=info
```

### 2. Install Dependencies

Dependencies are already installed, but if needed:

```bash
# Main dispatcher
npm install

# Dummy services
cd dummy-services/calendar-service && npm install
cd ../reminder-service && npm install
cd ../weather-service && npm install
```

## Running the System

### Quick Start - All Services at Once (Recommended)

Start the dispatcher and all dummy services with a single command:

```bash
npm run start:all
```

This will start all 4 services in parallel. You'll see logs from all services in one terminal.

For development mode with auto-reload:
```bash
npm run dev:all
```

### Manual Start - Individual Services

Alternatively, you can start services in separate terminal windows:

**Terminal 1 - Dispatcher:**
```bash
npm start
```

**Terminal 2 - Calendar Service:**
```bash
cd dummy-services/calendar-service
npm start
```

**Terminal 3 - Reminder Service:**
```bash
cd dummy-services/reminder-service
npm start
```

**Terminal 4 - Weather Service:**
```bash
cd dummy-services/weather-service
npm start
```

## Register Services

Once all services are running, register them with the dispatcher.

### Quick Registration (Recommended)

Use the helper script to register all services at once:

```bash
./register-services.sh
```

### Manual Registration

Or register each service individually:

```bash
# Register calendar service
curl -X POST http://localhost:3000/api/services/register \
  -H "x-api-key: your-secure-dispatcher-api-key" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "http://localhost:3001", "apiKey": "calendar-secret-key"}'

# Register reminder service
curl -X POST http://localhost:3000/api/services/register \
  -H "x-api-key: your-secure-dispatcher-api-key" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "http://localhost:3002", "apiKey": "reminder-secret-key"}'

# Register weather service
curl -X POST http://localhost:3000/api/services/register \
  -H "x-api-key: your-secure-dispatcher-api-key" \
  -H "Content-Type: application/json" \
  -d '{"baseUrl": "http://localhost:3003", "apiKey": "weather-secret-key"}'
```

## Test Dispatching

### Calendar Event
```bash
curl -X POST http://localhost:3000/api/dispatch \
  -H "x-api-key: your-secure-dispatcher-api-key" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Schedule a meeting tomorrow at 2pm"}'
```

Expected response:
```json
{
  "status": "success",
  "service": "calendar",
  "url": "calendar://event/123",
  "message": "Event 'Meeting' scheduled for tomorrow at 2pm"
}
```

### Reminder
```bash
curl -X POST http://localhost:3000/api/dispatch \
  -H "x-api-key: your-secure-dispatcher-api-key" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Remind me to buy milk"}'
```

### Weather Query
```bash
curl -X POST http://localhost:3000/api/dispatch \
  -H "x-api-key: your-secure-dispatcher-api-key" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "What is the weather in San Francisco"}'
```

### Uncertain Request
```bash
curl -X POST http://localhost:3000/api/dispatch \
  -H "x-api-key: your-secure-dispatcher-api-key" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Tomorrow at 2pm"}'
```

Expected response with options:
```json
{
  "status": "uncertain",
  "explanation": "I need more context...",
  "options": [
    {"id": "uuid", "name": "calendar", "description": "..."},
    {"id": "uuid", "name": "reminder", "description": "..."}
  ]
}
```

## Configuring Siri on iPhone

**📱 For complete step-by-step Siri setup instructions with screenshots and troubleshooting, see [SIRI_SETUP.md](SIRI_SETUP.md)**

Quick overview:

### Prerequisites

1. **Expose the dispatcher to the internet** - The dispatcher must be accessible from your phone. Options:
   - **ngrok** (recommended for testing):
     ```bash
     # In a new terminal, after starting services
     ngrok http 3000
     ```
     Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

   - **Deploy to a server** - Deploy to a cloud service (Heroku, Railway, AWS, etc.)

   - **Local network** - Use your computer's local IP if phone is on same WiFi

2. **Note your API key** from `.env` (the `DISPATCHER_API_KEY` value)

### Create Siri Shortcut

1. **Open Shortcuts app** on your iPhone

2. **Create new shortcut** (tap + button)

3. **Add "Dictate Text" action**:
   - Search for "Dictate Text"
   - Add it to your shortcut
   - This will capture your voice input

4. **Add "Get Contents of URL" action**:
   - Search for "Get Contents of URL"
   - Configure it as follows:

   **URL**: `https://your-dispatcher-url.com/api/dispatch`
   (Replace with your ngrok URL or server URL)

   **Method**: `POST`

   **Headers**:
   - Add header: `x-api-key` = `your-secure-dispatcher-api-key`
   - Add header: `Content-Type` = `application/json`

   **Request Body**: `JSON`

   **JSON structure**:
   ```json
   {
     "transcript": "[Dictated Text]"
   }
   ```
   (Tap the field, then select "Dictated Text" from the variables)

5. **Add "Get Dictionary from Input" action**:
   - Search for "Get Dictionary from Input"
   - This parses the JSON response

6. **Add conditional logic for URL**:
   - Add "Get Dictionary Value" action
   - Key: `url`
   - Input: Dictionary

   - Add "If" action
   - Condition: `URL` is not empty

   - Inside "If": Add "Open URL" action
   - URL: `URL` (from dictionary value)

   - In "Otherwise": Add "Show Result" action
   - Text: `Dictionary` (to show the full response if no URL)

7. **Name your shortcut**: e.g., "Dispatch Command"

8. **Add to Siri**:
   - Tap the shortcut name
   - Tap "Add to Siri"
   - Record a phrase like "Hey Siri, dispatch" or "Hey Siri, run command"

### Simplified Shortcut Configuration

Here's a visual summary of the shortcut flow:

```
1. Dictate Text
   ↓ [Dictated Text]
2. Get Contents of URL
   - URL: https://your-dispatcher.com/api/dispatch
   - Method: POST
   - Headers: x-api-key, Content-Type
   - Body: {"transcript": "[Dictated Text]"}
   ↓ [Contents of URL]
3. Get Dictionary from Input
   ↓ [Dictionary]
4. Get Dictionary Value (key: "url")
   ↓ [URL]
5. If [URL is not empty]
   - Open URL [URL]
   Otherwise
   - Show Result [Dictionary]
```

### Using the Shortcut

1. **Activate Siri**: "Hey Siri, dispatch" (or your custom phrase)
2. **Siri will prompt**: "What do you want to say?"
3. **Speak your command**:
   - "Schedule a meeting tomorrow at 2pm"
   - "Remind me to buy milk"
   - "What's the weather in San Francisco"
4. **Siri will**:
   - Send to dispatcher
   - Dispatcher routes to service via LLM
   - Service returns URL
   - Siri opens the URL (e.g., opens calendar app to the event)

### Troubleshooting Siri Setup

- **"Cannot connect to server"**:
  - Verify dispatcher URL is accessible from your phone
  - Test URL in mobile Safari first
  - Check ngrok is running if using it

- **"Invalid API key"**:
  - Double-check the `x-api-key` header matches your `.env` file

- **Nothing happens**:
  - Add "Show Result" actions between steps to debug
  - Check the dispatcher logs to see if request was received

- **Certificate errors with ngrok**:
  - Use the HTTPS URL from ngrok, not HTTP
  - ngrok provides valid SSL certificates

### Example Voice Commands

Once configured, try these commands:

- **Calendar**: "Schedule a team meeting tomorrow at 3pm"
- **Reminders**: "Remind me to call mom"
- **Weather**: "What's the weather like in New York"
- **List events**: "Show me my calendar events"
- **Check reminders**: "What are my reminders"

## API Endpoints

### Dispatcher Endpoints

- **POST /api/dispatch** - Main dispatch endpoint for voice transcripts
- **POST /api/dispatch/select** - Manual service selection
- **GET /api/services** - List registered services
- **POST /api/services/register** - Register a new service
- **DELETE /api/services/:serviceId** - Unregister a service
- **GET /health** - Health check (no auth)

### Service Endpoints

Each service implements:
- **GET /health** - Health check
- **GET /dispatch/docs** - Service documentation (requires API key)
- Business endpoints (varies by service)

## How It Works

1. **Siri sends voice transcript** to `/api/dispatch` with API key header
2. **Dispatcher queries LLM** with all registered services as tools (OpenAI function calling)
3. **LLM extracts parameters** and selects appropriate service/endpoint
4. **Dispatcher calls service** with extracted parameters
5. **Service returns URL** (e.g., `calendar://event/123`)
6. **Dispatcher returns URL to Siri** which opens it

## Database

The system uses lowdb (JSON file-based database). Data is stored in `db.json`:

- **services**: Registered services with endpoints and health status
- **requests**: Log of all dispatch requests with arguments and results

## Adding New Services

To create a new service:

1. Implement Express server with these endpoints:
   - `GET /health` - Return `{status: 'ok', service: 'name'}`
   - `GET /dispatch/docs` - Return service documentation (see schema below)
   - Business endpoints as needed

2. Service documentation schema:
```json
{
  "name": "service-name",
  "description": "What this service does",
  "endpoints": [
    {
      "method": "POST",
      "path": "/action",
      "description": "What this endpoint does",
      "parameters": {
        "type": "object",
        "properties": {
          "param1": {
            "type": "string",
            "description": "Parameter description"
          }
        },
        "required": ["param1"]
      }
    }
  ]
}
```

3. Return URL in responses:
```json
{
  "success": true,
  "message": "Action completed",
  "url": "myapp://action/123"
}
```

4. Register with dispatcher using POST /api/services/register

## Production Deployment

**🚀 Deploy to your server:**
- **Quick Start**: [QUICKSTART_PRODUCTION.md](QUICKSTART_PRODUCTION.md) - Deploy in 5 minutes
- **Complete Guide**: [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed instructions, monitoring, security

Quick deployment overview:

### Deploy to Server with PM2

The included `ecosystem.config.js` configures PM2 to run all services:

```bash
# On your server (e.g., Raspberry Pi)
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Ports used in production** (configured in ecosystem.config.js):
- Dispatcher: `3100`
- Calendar service: `3101`
- Reminder service: `3102`
- Weather service: `3103`

### Configure Reverse Proxy

Point your domain (e.g., `https://dispatch.michoest.com`) to port 3100 using nginx or Caddy.

Example Caddy config:
```caddy
dispatch.michoest.com {
    reverse_proxy localhost:3100
}
```

### Update Siri Shortcut

Change the URL in your Siri Shortcut to:
```
https://dispatch.michoest.com/api/dispatch
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete instructions including:
- PM2 configuration and management
- Nginx/Caddy reverse proxy setup
- SSL/HTTPS configuration
- Service registration on server
- Monitoring and maintenance
- Security best practices

## Troubleshooting

- **"No healthy services available"**: Ensure all services are running and registered
- **OpenAI errors**: Check your API key in `.env`
- **Service registration fails**: Verify service is running and `/dispatch/docs` endpoint works
- **Health checks failing**: Services must respond to `GET /health` within 3 seconds

## Development

```bash
# Run dispatcher in dev mode with auto-reload
npm run dev

# Run a service in dev mode
cd dummy-services/calendar-service
npm run dev
```

## Architecture Notes

- **OpenAI Function Calling**: Each service endpoint becomes a separate tool for the LLM
- **Health Checks**: Run every 60 seconds, services marked healthy/unhealthy
- **Confidence Handling**: If LLM doesn't call a function, returns options instead
- **Logging**: All requests logged to database with arguments and callback URLs
