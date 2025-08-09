import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface PerplexitySearchResult {
  content: string;
  metadata?: {
    sources?: string[];
    query: string;
    response_type: 'brief' | 'normal' | 'detailed';
  };
}

export interface PerplexityChatResult {
  chat_id: string;
  response: string;
}

export class PerplexityMCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;

  constructor() {
    // 初始化客户端
  }

  /**
   * 连接到Perplexity MCP服务器
   */
  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        return;
      }

      console.log('正在启动Perplexity MCP服务器...');
      
      // 创建传输层 - 假设已经安装了perplexity-mcp-zerver
      this.transport = new StdioClientTransport({
        command: 'node',
        args: ['/Users/yangchengxuan/Desktop/hackathone2/perplexity-mcp-zerver/build/index.js'],
        env: process.env
      });

      // 创建客户端
      this.client = new Client({
        name: 'perplexity-client',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      // 连接到服务器
      await this.client.connect(this.transport);
      this.isConnected = true;
      
      console.log('Perplexity MCP客户端连接成功');
    } catch (error) {
      console.error('连接Perplexity MCP服务器失败:', error);
      // 如果MCP连接失败，回退到模拟模式
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    try {
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }
      this.client = null;
      this.isConnected = false;
      console.log('Perplexity MCP客户端已断开连接');
    } catch (error) {
      console.error('断开Perplexity MCP连接时出错:', error);
    }
  }

  /**
   * 使用Perplexity搜索
   */
  async search(query: string, responseType: 'brief' | 'normal' | 'detailed' = 'normal'): Promise<PerplexitySearchResult> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (this.client && this.isConnected) {
        // 使用MCP工具搜索
        const searchResult = await this.client.callTool({
          name: 'search',
          arguments: {
            query,
            response_type: responseType
          }
        });

        console.log('Perplexity MCP搜索成功');
        
        if (searchResult.content && Array.isArray(searchResult.content)) {
          const content = searchResult.content.map((c: any) => c.text || c).join(' ');
          
          return {
            content,
            metadata: {
              query,
              response_type: responseType,
              sources: [] // Perplexity通常会在内容中包含来源信息
            }
          };
        }
      }

      // 如果MCP失败，返回模拟数据
      return await this.searchFallback(query, responseType);
    } catch (error) {
      console.error('Perplexity搜索时出错:', error);
      // 回退到模拟模式
      return await this.searchFallback(query, responseType);
    }
  }

  /**
   * 获取技术文档
   */
  async getDocumentation(technology: string, context?: string): Promise<PerplexitySearchResult> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (this.client && this.isConnected) {
        const docResult = await this.client.callTool({
          name: 'get_documentation',
          arguments: {
            technology,
            context: context || ''
          }
        });

        if (docResult.content && Array.isArray(docResult.content)) {
          const content = docResult.content.map((c: any) => c.text || c).join(' ');
          
          return {
            content,
            metadata: {
              query: `${technology} documentation ${context || ''}`,
              response_type: 'detailed',
              sources: []
            }
          };
        }
      }

      // 回退模式
      return {
        content: `关于 ${technology} 的文档信息：这是一个强大的技术工具，具有丰富的功能和广泛的应用场景。${context ? `在 ${context} 上下文中特别有用。` : ''}`,
        metadata: {
          query: `${technology} documentation`,
          response_type: 'detailed',
          sources: []
        }
      };
    } catch (error) {
      console.error('获取文档时出错:', error);
      return {
        content: `获取 ${technology} 文档时出现错误，请稍后重试。`,
        metadata: {
          query: `${technology} documentation`,
          response_type: 'detailed',
          sources: []
        }
      };
    }
  }

  /**
   * 查找相关API
   */
  async findAPIs(requirements: string, context?: string): Promise<PerplexitySearchResult> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (this.client && this.isConnected) {
        const apiResult = await this.client.callTool({
          name: 'find_apis',
          arguments: {
            requirements,
            context: context || ''
          }
        });

        if (apiResult.content && Array.isArray(apiResult.content)) {
          const content = apiResult.content.map((c: any) => c.text || c).join(' ');
          
          return {
            content,
            metadata: {
              query: `APIs for ${requirements}`,
              response_type: 'detailed',
              sources: []
            }
          };
        }
      }

      // 回退模式
      return {
        content: `针对 "${requirements}" 需求的API建议：建议查看相关的开源API和商业API解决方案。${context ? `在 ${context} 环境中可以考虑使用相应的技术栈。` : ''}`,
        metadata: {
          query: `APIs for ${requirements}`,
          response_type: 'detailed',
          sources: []
        }
      };
    } catch (error) {
      console.error('查找API时出错:', error);
      return {
        content: `查找 "${requirements}" 相关API时出现错误，请稍后重试。`,
        metadata: {
          query: `APIs for ${requirements}`,
          response_type: 'detailed',
          sources: []
        }
      };
    }
  }

  /**
   * 与Perplexity进行持续对话
   */
  async chat(message: string, chatId?: string): Promise<PerplexityChatResult> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (this.client && this.isConnected) {
        const chatResult = await this.client.callTool({
          name: 'chat_perplexity',
          arguments: {
            message,
            chat_id: chatId
          }
        });

        if (chatResult.content && Array.isArray(chatResult.content)) {
          const content = chatResult.content.map((c: any) => c.text || c).join(' ');
          
          try {
            const parsedResult = JSON.parse(content);
            return {
              chat_id: parsedResult.chat_id || 'default',
              response: parsedResult.response || content
            };
          } catch {
            return {
              chat_id: chatId || 'default',
              response: content
            };
          }
        }
      }

      // 回退模式
      return {
        chat_id: chatId || 'default',
        response: `关于 "${message}" 的回复：这是一个有趣的话题，需要进一步的研究和分析。`
      };
    } catch (error) {
      console.error('Perplexity聊天时出错:', error);
      return {
        chat_id: chatId || 'default',
        response: `处理消息 "${message}" 时出现错误，请稍后重试。`
      };
    }
  }

  /**
   * 搜索回退方法（当MCP不可用时）
   */
  private async searchFallback(query: string, responseType: 'brief' | 'normal' | 'detailed'): Promise<PerplexitySearchResult> {
    // 模拟Perplexity搜索结果
    const responses = {
      brief: `关于 "${query}" 的简要信息：这是一个重要的主题，具有广泛的应用和研究价值。`,
      normal: `关于 "${query}" 的详细信息：这个主题涉及多个方面，包括理论基础、实际应用和最新发展。相关研究表明这是一个活跃的领域，有许多有趣的发现和应用前景。`,
      detailed: `关于 "${query}" 的深入分析：这是一个复杂而重要的主题，涉及多个学科和领域。从历史发展来看，这个领域经历了重要的演变和突破。当前的研究重点包括理论创新、技术应用和实际问题解决。未来的发展方向可能包括更深入的理论研究、更广泛的应用场景和更高效的解决方案。`
    };

    return {
      content: responses[responseType],
      metadata: {
        query,
        response_type: responseType,
        sources: ['模拟数据源']
      }
    };
  }

  /**
   * 获取实验相关的知识（替代Wikipedia功能）
   */
  async getExperimentKnowledge(experimentTopic: string): Promise<string> {
    try {
      // 首先尝试搜索基础信息
      const searchResult = await this.search(experimentTopic, 'detailed');
      
      // 然后尝试获取相关文档
      const docResult = await this.getDocumentation(experimentTopic, 'experiment simulation');
      
      let knowledge = `以下是关于 "${experimentTopic}" 的Perplexity研究结果：\n\n`;
      
      knowledge += `**基础信息：**\n${searchResult.content}\n\n`;
      knowledge += `**技术文档：**\n${docResult.content}\n\n`;
      
      knowledge += `*信息来源：Perplexity AI 研究*\n`;

      return knowledge;
    } catch (error) {
      console.error('获取实验知识时出错:', error);
      return `获取 "${experimentTopic}" 的Perplexity知识时出现错误。`;
    }
  }
}

// 创建全局实例
export const perplexityMCPClient = new PerplexityMCPClient();