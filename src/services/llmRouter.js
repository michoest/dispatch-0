const OpenAI = require('openai');
const config = require('../config/config');
const { listServices } = require('./serviceRegistry');
const logger = require('../utils/logger');

const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

function convertServiceToTool(service) {
  // Convert each endpoint to a separate tool
  return service.endpoints.map(endpoint => {
    const toolName = `${service.name}_${endpoint.method.toLowerCase()}_${endpoint.path.replace(/\//g, '_')}`;

    return {
      type: 'function',
      function: {
        name: toolName,
        description: `${service.description}: ${endpoint.description}`,
        parameters: endpoint.parameters || {
          type: 'object',
          properties: {}
        }
      },
      metadata: {
        serviceId: service.id,
        serviceName: service.name,
        endpoint: {
          method: endpoint.method,
          path: endpoint.path
        }
      }
    };
  });
}

async function routeRequest(transcript) {
  const services = listServices().filter(s => s.status === 'healthy');

  if (services.length === 0) {
    throw new Error('No healthy services available');
  }

  // Convert all services to tools
  const toolsWithMetadata = services.flatMap(convertServiceToTool);
  const tools = toolsWithMetadata.map(({ metadata, ...tool }) => tool);

  logger.info(`Routing request with ${tools.length} available tools`);

  try {
    const response = await openai.chat.completions.create({
      model: config.llmModel,
      messages: [
        {
          role: 'system',
          content: 'You are a service dispatcher. Based on the user\'s voice command, select the most appropriate service and endpoint to handle the request. Extract relevant parameters from the voice command. If uncertain, you can explain why.'
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      tools,
      tool_choice: 'auto'
    });

    const message = response.choices[0].message;

    // Check if function was called
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const toolMetadata = toolsWithMetadata.find(
        t => t.function.name === toolCall.function.name
      ).metadata;

      return {
        confident: true,
        selectedService: toolMetadata.serviceName,
        serviceId: toolMetadata.serviceId,
        endpoint: toolMetadata.endpoint,
        parameters: JSON.parse(toolCall.function.arguments),
        rawResponse: message
      };
    } else {
      // LLM didn't call a function - uncertain
      return {
        confident: false,
        explanation: message.content,
        availableServices: services.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description
        }))
      };
    }

  } catch (error) {
    logger.error('OpenAI API error:', error);
    throw error;
  }
}

module.exports = { routeRequest };
