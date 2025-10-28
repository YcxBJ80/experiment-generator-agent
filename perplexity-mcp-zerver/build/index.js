#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

// Create the MCP server
const server = new Server(
  {
    name: 'perplexity-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define the tool list
const tools = [
  {
    name: 'search',
    description: 'Search for information using Perplexity AI',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query'
        },
        response_type: {
          type: 'string',
          enum: ['brief', 'normal', 'detailed'],
          description: 'Type of response detail level'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_documentation',
    description: 'Get documentation for a specific technology or topic',
    inputSchema: {
      type: 'object',
      properties: {
        technology: {
          type: 'string',
          description: 'The technology or topic to get documentation for'
        },
        context: {
          type: 'string',
          description: 'Additional context for the documentation request'
        }
      },
      required: ['technology']
    }
  },
  {
    name: 'find_apis',
    description: 'Find APIs based on requirements',
    inputSchema: {
      type: 'object',
      properties: {
        requirements: {
          type: 'string',
          description: 'The API requirements or functionality needed'
        },
        context: {
          type: 'string',
          description: 'Additional context for the API search'
        }
      },
      required: ['requirements']
    }
  },
  {
    name: 'check_deprecated',
    description: 'Check if code or technology is deprecated',
    inputSchema: {
      type: 'object',
      properties: {
        code_or_tech: {
          type: 'string',
          description: 'The code snippet or technology to check'
        }
      },
      required: ['code_or_tech']
    }
  },
  {
    name: 'extract_url_content',
    description: 'Extract content from a URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to extract content from'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'chat',
    description: 'Start or continue a chat conversation',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to send'
        },
        chat_id: {
          type: 'string',
          description: 'Optional chat ID to continue existing conversation'
        }
      },
      required: ['message']
    }
  }
];

// Handle list-tools requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools
  };
});

// Handle tool invocations
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'search':
        return {
          content: [
            {
              type: 'text',
              text: `Simulated search result: ${args.response_type || 'normal'}-detail information about "${args.query}". This placeholder Perplexity response includes representative research highlights and data. A production implementation would call the real Perplexity API or automate the browser to gather results.`
            }
          ]
        };
        
      case 'get_documentation':
        return {
          content: [
            {
              type: 'text',
              text: `Simulated documentation lookup: technical references for "${args.technology}".${args.context ? ` Context: ${args.context}.` : ''} This mock response surfaces specifications, examples, and best practices. A real integration would query Perplexity for the latest documentation.`
            }
          ]
        };
        
      case 'find_apis':
        return {
          content: [
            {
              type: 'text',
              text: `Simulated API discovery: APIs related to the requirement "${args.requirements}".${args.context ? ` Context: ${args.context}.` : ''} This placeholder result lists recommended APIs with usage notes and integration tips.`
            }
          ]
        };
        
      case 'check_deprecated_code':
        return {
          content: [
            {
              type: 'text',
              text: `Simulated code review: analysing snippets from the "${args.technology}" stack, highlighting deprecated patterns and suggesting alternatives. This is purely a mock analysis.`
            }
          ]
        };
        
      case 'extract_url_content':
        return {
          content: [
            {
              type: 'text',
              text: `Simulated content extraction: summary of material from "${args.url}". Crawl depth: ${args.depth || 1}. This mock response captures representative page text and metadata.`
            }
          ]
        };
        
      case 'chat_perplexity':
        const chatId = args.chat_id || `chat_${Date.now()}`;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                chat_id: chatId,
                response: `Simulated Perplexity reply: intelligent response about "${args.message}". This keeps the ongoing conversation alive under ID ${chatId}.`
              })
            }
          ]
        };
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    throw new Error(`Tool execution failed: ${error.message}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Perplexity MCP Server started');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}

module.exports = { server };
