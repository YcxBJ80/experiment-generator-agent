#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

// 创建 MCP 服务器
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

// 定义工具列表
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

// 处理工具列表请求
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'search':
        return {
          content: [
            {
              type: 'text',
              text: `模拟搜索结果：关于"${args.query}"的${args.response_type || 'normal'}级别信息。这是一个模拟的Perplexity搜索结果，包含了相关的研究信息和数据。在实际实现中，这里会调用真实的Perplexity API或网页自动化来获取搜索结果。`
            }
          ]
        };
        
      case 'get_documentation':
        return {
          content: [
            {
              type: 'text',
              text: `模拟文档获取：关于"${args.technology}"的技术文档。${args.context ? `上下文：${args.context}。` : ''}这是一个模拟的文档获取结果，包含了技术规范、使用示例和最佳实践。在实际实现中，这里会通过Perplexity获取最新的技术文档。`
            }
          ]
        };
        
      case 'find_apis':
        return {
          content: [
            {
              type: 'text',
              text: `模拟API查找：根据需求"${args.requirements}"找到的相关API。${args.context ? `上下文：${args.context}。` : ''}这是一个模拟的API查找结果，包含了推荐的API列表、使用方法和集成指南。`
            }
          ]
        };
        
      case 'check_deprecated_code':
        return {
          content: [
            {
              type: 'text',
              text: `模拟代码检查：分析"${args.technology}"技术栈中的代码片段。检测到的废弃模式和建议的替代方案。这是一个模拟的代码分析结果。`
            }
          ]
        };
        
      case 'extract_url_content':
        return {
          content: [
            {
              type: 'text',
              text: `模拟内容提取：从URL "${args.url}" 提取的内容摘要。递归深度：${args.depth || 1}。这是一个模拟的内容提取结果，包含了网页的主要文本内容和元数据。`
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
                response: `模拟Perplexity对话回复：关于"${args.message}"的智能回答。这是一个持续的对话会话，ID为${chatId}。`
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

// 启动服务器
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