# Voice Dispatcher Integration Spec

## What is the Voice Dispatcher?

The voice dispatcher is a central server that receives voice commands from Siri shortcuts and intelligently routes them to appropriate services using an LLM (OpenAI). When you speak a command like "Schedule a meeting tomorrow at 2pm" to Siri, the dispatcher:

1. Receives the voice transcript
2. Queries all registered services to understand their capabilities
3. Uses OpenAI function calling to determine which service should handle the request
4. Extracts parameters from the voice command
5. Calls the appropriate service endpoint with those parameters
6. Returns the service's URL to Siri, which opens it in the browser

This allows you to control multiple web apps (tasks, calendar, notes, etc.) through natural voice commands, with the LLM automatically understanding your intent and routing to the right service.

## Integration Requirements

To make your service compatible with the voice dispatcher, you need to add three dispatcher-specific endpoints. These should be at a `/dispatch/` sub-path to avoid conflicts with your existing frontend API endpoints.

### Required Endpoints

#### 1. Health Check

**GET /dispatch/health**

Simple health check endpoint (no authentication required):

```javascript
app.get('/dispatch/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'your-service-name'  // e.g., 'tasks', 'calendar', 'notes'
  });
});
```

The dispatcher uses this to monitor service availability.

---

#### 2. Service Documentation

**GET /dispatch/docs**

This endpoint tells the dispatcher what your service can do. It returns a JSON document describing all available dispatcher endpoints:

```javascript
const BASE_URL = process.env.BASE_URL || 'https://yourapp.yourdomain.com';

// Auth middleware for dispatcher endpoints
function dispatchAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.DISPATCH_API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  next();
}

app.get('/dispatch/docs', dispatchAuth, (req, res) => {
  res.json({
    name: 'your-service-name',
    description: 'Brief description of what this service does',
    endpoints: [
      {
        method: 'POST',  // or 'GET'
        path: '/dispatch/endpoint-name',
        description: 'What this endpoint does (used by LLM to understand when to call it)',
        parameters: {
          type: 'object',
          properties: {
            paramName: {
              type: 'string',  // or 'number', 'boolean', etc.
              description: 'What this parameter represents'
            },
            optionalParam: {
              type: 'number',
              description: 'An optional parameter'
            }
          },
          required: ['paramName']  // List required parameters
        }
      }
      // Add more endpoints as needed
    ]
  });
});
```

**Parameter types** (JSON Schema):
- `string` - Text values
- `number` - Numeric values
- `boolean` - true/false
- `array` - Lists: `{ type: 'array', items: { type: 'string' } }`
- `object` - Nested objects with `properties`
- `enum` - Limited choices: `{ type: 'string', enum: ['option1', 'option2'] }`

---

#### 3. Business Endpoints

These are the actual endpoints that perform actions. They should:
- Be at `/dispatch/` sub-path (e.g., `/dispatch/tasks/create`, `/dispatch/events/add`)
- Require dispatcher API key authentication
- Accept parameters extracted by the LLM
- Return an HTTPS URL to your web app

**Example - Create Task:**

```javascript
app.post('/dispatch/tasks/create', dispatchAuth, (req, res) => {
  const { title, dueDate, priority } = req.body;

  // Validate required parameters
  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: title'
    });
  }

  // Your business logic here
  const task = {
    id: generateId(),
    title,
    dueDate: dueDate || null,
    priority: priority || 'medium',
    createdAt: new Date().toISOString()
  };

  saveTask(task);  // Your storage logic

  // Return success with URL to the task in your web app
  res.status(201).json({
    success: true,
    message: `Task created: "${title}"`,  // Human-readable message
    url: `${BASE_URL}/tasks/${task.id}`,  // IMPORTANT: Real HTTPS URL to your PWA
    data: task  // Optional: include created resource
  });
});
```

**Example - List Tasks:**

```javascript
app.get('/dispatch/tasks/list', dispatchAuth, (req, res) => {
  const { status, limit } = req.query;

  const tasks = getTasks({ status, limit });  // Your retrieval logic

  res.json({
    success: true,
    message: `Found ${tasks.length} tasks`,
    url: `${BASE_URL}/tasks`,  // URL to tasks list view
    data: { tasks, count: tasks.length }
  });
});
```

**Example - Get Weather:**

```javascript
app.get('/dispatch/weather/current', dispatchAuth, (req, res) => {
  const { location } = req.query;

  if (!location) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameter: location'
    });
  }

  const weather = getWeatherData(location);  // Your weather API call

  res.json({
    success: true,
    message: `Current weather in ${location}: ${weather.temperature}°C, ${weather.condition}`,
    url: `${BASE_URL}/weather?location=${encodeURIComponent(location)}`,
    data: { weather }
  });
});
```

---

## Critical: The URL Field

**The `url` field in the response is crucial.** This is what Siri will open after the command completes.

**Requirements:**
- Must be a real HTTPS URL (required for Siri shortcuts)
- Should point to your service's web interface (PWA)
- Should link to the specific resource, not your homepage
- Must work when opened in a mobile browser

**Examples:**
- Task created: `https://tasks.yourdomain.com/tasks/abc123`
- Event created: `https://calendar.yourdomain.com/events/xyz789`
- Note created: `https://notes.yourdomain.com/note/def456`
- List view: `https://tasks.yourdomain.com/tasks?filter=today`
- Weather: `https://weather.yourdomain.com/current?location=London`

The user experience is:
1. User says to Siri: "Add milk to my shopping list"
2. Dispatcher routes to your service's `/dispatch/shopping/add` endpoint
3. Your service creates the item and returns `{"url": "https://shopping.yourdomain.com/list"}`
4. Siri opens that URL → User sees their shopping list with the new item

---

## Environment Configuration

Add these to your `.env` file:

```env
# API key used by the dispatcher to authenticate with your service
DISPATCH_API_KEY=your-unique-secret-key

# Base URL of your web app (where users will be redirected)
BASE_URL=https://yourapp.yourdomain.com
```

---

## Authentication

All `/dispatch/*` endpoints should require API key authentication:

```javascript
function dispatchAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.DISPATCH_API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  next();
}

// Apply to all dispatch endpoints
app.use('/dispatch', dispatchAuth);
```

The dispatcher will include the API key in the `x-api-key` header when calling your endpoints.

---

## Complete Example

Here's a complete example for a task management service:

```javascript
const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

const BASE_URL = process.env.BASE_URL || 'https://tasks.yourdomain.com';
const DISPATCH_API_KEY = process.env.DISPATCH_API_KEY;

// In-memory storage (replace with your database)
const tasks = [];

// Dispatcher auth middleware
function dispatchAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== DISPATCH_API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  next();
}

// 1. Health check
app.get('/dispatch/health', (req, res) => {
  res.json({ status: 'ok', service: 'tasks' });
});

// 2. Service documentation
app.get('/dispatch/docs', dispatchAuth, (req, res) => {
  res.json({
    name: 'tasks',
    description: 'Manages tasks and to-do items',
    endpoints: [
      {
        method: 'POST',
        path: '/dispatch/tasks/create',
        description: 'Create a new task',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Task title or description'
            },
            dueDate: {
              type: 'string',
              description: 'Due date in ISO format or relative (e.g., "tomorrow")'
            },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Task priority level'
            }
          },
          required: ['title']
        }
      },
      {
        method: 'GET',
        path: '/dispatch/tasks/list',
        description: 'List all tasks',
        parameters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'all'],
              description: 'Filter tasks by status'
            }
          }
        }
      }
    ]
  });
});

// 3. Business endpoints
app.post('/dispatch/tasks/create', dispatchAuth, (req, res) => {
  const { title, dueDate, priority } = req.body;

  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: title'
    });
  }

  const task = {
    id: Date.now().toString(),
    title,
    dueDate: dueDate || null,
    priority: priority || 'medium',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  tasks.push(task);

  res.status(201).json({
    success: true,
    message: `Task created: "${title}"`,
    url: `${BASE_URL}/tasks/${task.id}`,
    data: task
  });
});

app.get('/dispatch/tasks/list', dispatchAuth, (req, res) => {
  const { status } = req.query;
  const filtered = status && status !== 'all'
    ? tasks.filter(t => t.status === status)
    : tasks;

  res.json({
    success: true,
    message: `Found ${filtered.length} tasks`,
    url: `${BASE_URL}/tasks`,
    data: { tasks: filtered, count: filtered.length }
  });
});

// Your existing frontend API endpoints remain unchanged
app.get('/api/tasks', yourExistingAuth, (req, res) => {
  // Your existing format
  res.json({ tasks });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
```

---

## Fuzzy Matching: Bridging Natural Language and Structured Data

**Problem**: Voice commands use natural language ("start cello practice") but your data is structured (activity IDs, exact names, etc.). The dispatcher extracts raw text parameters, but cannot know your internal data model.

**Solution**: Your `/dispatch/*` endpoints must accept flexible input and do internal matching.

### Example: Activity Tracking

User says: *"I'm starting cello practice"*
Dispatcher extracts: `{activity: "cello"}`
Your service must match "cello" → Activity ID or name in your database.

```javascript
app.post('/dispatch/activity/start', dispatchAuth, async (req, res) => {
  const { activity } = req.body;

  // 1. Find matching activity (fuzzy match, case-insensitive)
  const match = await findActivity(activity);

  if (!match) {
    return res.status(404).json({
      success: false,
      error: `No activity found matching "${activity}"`,
      url: `${BASE_URL}/activities`  // Show activities list
    });
  }

  if (match.length > 1) {
    // Multiple matches - return list for user to choose
    return res.json({
      success: false,
      message: `Multiple activities match "${activity}"`,
      suggestions: match.map(a => a.name),
      url: `${BASE_URL}/activities?search=${encodeURIComponent(activity)}`
    });
  }

  // 2. Start the activity
  const session = await startActivity(match.id);

  res.json({
    success: true,
    message: `Started ${match.name}`,
    url: `${BASE_URL}/sessions/${session.id}`,
    data: { session, activity: match }
  });
});

// Fuzzy matching helper
async function findActivity(input) {
  const activities = await getActivities();
  const normalized = input.toLowerCase().trim();

  // Exact match
  let match = activities.find(a => a.name.toLowerCase() === normalized);
  if (match) return [match];

  // Partial match
  const partial = activities.filter(a =>
    a.name.toLowerCase().includes(normalized) ||
    normalized.includes(a.name.toLowerCase())
  );

  return partial;
}
```

### Other Examples

**Task lists**: "add milk to shopping" → match "shopping" to "Shopping List" or "Groceries"
**Projects**: "time for project website" → match "website" to "Company Website Redesign"
**Categories**: "expense for food" → match "food" to "Food & Dining" category

### Best Practices

1. **Be flexible**: Accept variations, typos, partial matches
2. **Return suggestions**: If ambiguous, show options via the URL
3. **Default gracefully**: If no match, redirect to a useful page (list view, search)
4. **Log misses**: Track failed matches to improve your matching logic
5. **User feedback**: Let users see what was matched in the success message

---

## Registering with the Dispatcher

Once your endpoints are implemented, register your service with the dispatcher:

```bash
curl -X POST https://dispatch.yourdomain.com/api/services/register \
  -H "x-api-key: DISPATCHER_MAIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://yourapp.yourdomain.com",
    "apiKey": "your-unique-secret-key"
  }'
```

The dispatcher will:
1. Call your `/dispatch/docs` endpoint to fetch capabilities
2. Store your service in its registry
3. Include your endpoints when routing voice commands
4. Monitor your `/dispatch/health` endpoint periodically

---

## Testing

### 1. Test health check
```bash
curl https://yourapp.yourdomain.com/dispatch/health
```

### 2. Test documentation
```bash
curl https://yourapp.yourdomain.com/dispatch/docs \
  -H "x-api-key: your-unique-secret-key"
```

### 3. Test endpoint
```bash
curl -X POST https://yourapp.yourdomain.com/dispatch/tasks/create \
  -H "x-api-key: your-unique-secret-key" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test task", "priority": "high"}'
```

### 4. Test via dispatcher
```bash
curl -X POST https://dispatch.yourdomain.com/api/dispatch \
  -H "x-api-key: DISPATCHER_MAIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Add a test task with high priority"}'
```

---

## Key Points

1. **Sub-path**: Use `/dispatch/*` for all dispatcher endpoints to avoid conflicts with your frontend API
2. **URL field**: Always return a real HTTPS URL to your web app - this is what Siri opens
3. **Fuzzy matching**: Accept flexible input and match it to your structured data (activities, lists, categories, etc.)
4. **Authentication**: Protect `/dispatch/docs` and business endpoints with API key
5. **Health check**: Keep `/dispatch/health` unauthenticated for monitoring
6. **Descriptions**: Write clear descriptions - the LLM uses these to understand when to call each endpoint
7. **Parameters**: Use JSON Schema to describe parameters accurately
8. **Error handling**: Return appropriate status codes and error messages
9. **Base URL**: Use environment variable for flexibility across dev/staging/production

---

## Voice Command Examples

Once integrated, users can control your service via Siri:

- "Add buy milk to my tasks" → Creates task, opens your task detail page
- "Show me my pending tasks" → Lists tasks, opens your tasks page
- "Create a high priority task to call mom tomorrow" → Creates task with extracted parameters
- "What's the weather in London" → Shows weather, opens your weather page
- "I'm starting cello practice" → Service matches "cello" to "Cello Practice" activity, starts session
- "Add milk to shopping" → Service matches "shopping" to "Shopping List", adds item

The dispatcher handles natural language understanding and routing. Your service handles matching flexible input to your structured data.
