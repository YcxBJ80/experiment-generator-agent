import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

export interface WikipediaSearchResult {
  title: string;
  content: string;
  url?: string;
}

export class WikipediaMCPClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;
  private serverProcess: any = null;

  constructor() {
    // 初始化客户端
  }

  /**
   * 连接到Wikipedia MCP服务器
   */
  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        return;
      }

      console.log('正在启动Wikipedia MCP服务器...');
      
      // 设置代理环境变量
      const env = {
        ...process.env,
        https_proxy: 'http://127.0.0.1:7890',
        http_proxy: 'http://127.0.0.1:7890',
        all_proxy: 'socks5://127.0.0.1:7890'
      };

      // 创建传输层
      this.transport = new StdioClientTransport({
        command: 'wikipedia-mcp',
        args: ['--language', 'en'],
        env
      });

      // 创建客户端
      this.client = new Client({
        name: 'wikipedia-client',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      // 连接到服务器
      await this.client.connect(this.transport);
      this.isConnected = true;
      
      console.log('Wikipedia MCP客户端连接成功');
    } catch (error) {
      console.error('连接Wikipedia MCP服务器失败:', error);
      // 如果MCP连接失败，回退到直接API调用
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
      console.log('Wikipedia MCP客户端已断开连接');
    } catch (error) {
      console.error('断开Wikipedia MCP连接时出错:', error);
    }
  }

  /**
   * 搜索Wikipedia文章
   */
  async searchWikipedia(query: string, limit: number = 3): Promise<WikipediaSearchResult[]> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (this.client && this.isConnected) {
        // 使用MCP工具搜索
        const searchResult = await this.client.callTool({
          name: 'search_wikipedia',
          arguments: {
            query,
            limit
          }
        });

        console.log('MCP搜索成功');
        
        // 根据实际测试，search_wikipedia返回的是content数组
        if (searchResult.content && Array.isArray(searchResult.content)) {
          const results: WikipediaSearchResult[] = [];
          
          // 解析搜索结果
          const searchText = searchResult.content.map((c: any) => c.text || c).join(' ');
          
          try {
            // 尝试解析JSON格式的搜索结果
            const searchData = JSON.parse(searchText);
            
            if (searchData.results && Array.isArray(searchData.results)) {
              for (const item of searchData.results.slice(0, limit)) {
                // 获取每个文章的摘要
                try {
                  const summaryResult = await this.client.callTool({
                    name: 'get_summary',
                    arguments: {
                      title: item.title
                    }
                  });
                  
                  let content = '';
                  if (summaryResult.content && Array.isArray(summaryResult.content)) {
                    // 提取摘要文本
                    const summaryText = summaryResult.content.map((c: any) => c.text || c).join(' ');
                    try {
                      // 尝试解析JSON格式的摘要
                      const summaryData = JSON.parse(summaryText);
                      content = summaryData.summary || summaryText;
                    } catch {
                      // 如果不是JSON，直接使用文本
                      content = summaryText;
                    }
                  } else {
                    // 回退到搜索片段
                    content = item.snippet ? item.snippet.replace(/<[^>]*>/g, '') : '无摘要';
                  }
                  
                  results.push({
                    title: item.title,
                    content: content,
                    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`
                  });
                } catch (summaryError) {
                  console.error(`获取文章 ${item.title} 摘要失败:`, summaryError);
                  // 如果获取摘要失败，使用搜索片段
                  results.push({
                    title: item.title,
                    content: item.snippet ? item.snippet.replace(/<[^>]*>/g, '') : '无摘要',
                    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`
                  });
                }
              }
            }
          } catch (parseError) {
            console.error('解析搜索结果JSON失败:', parseError);
            // 如果解析失败，直接使用文本内容
            results.push({
              title: query,
              content: searchText,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/ /g, '_'))}`
            });
          }
          
          return results;
        }
      }

      // 如果MCP失败，回退到API模式
      return await this.searchWikipediaAPI(query, limit);
    } catch (error) {
      console.error('搜索Wikipedia时出错:', error);
      // 回退到API模式
      return await this.searchWikipediaAPI(query, limit);
    }
  }

  /**
   * 使用Wikipedia API搜索（作为MCP的替代实现）
   */
  private async searchWikipediaAPI(query: string, limit: number): Promise<WikipediaSearchResult[]> {
    try {
      // 搜索相关文章
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/search?q=${encodeURIComponent(query)}&limit=${limit}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (!searchData.pages || searchData.pages.length === 0) {
        return [];
      }

      const results: WikipediaSearchResult[] = [];

      // 获取每篇文章的详细内容
      for (const page of searchData.pages.slice(0, limit)) {
        try {
          const contentUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.key)}`;
          const contentResponse = await fetch(contentUrl);
          const contentData = await contentResponse.json();

          results.push({
            title: contentData.title || page.title,
            content: contentData.extract || page.description || '',
            url: contentData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.key)}`
          });
        } catch (error) {
          console.error(`获取文章 ${page.title} 内容时出错:`, error);
          // 如果获取详细内容失败，至少保留基本信息
          results.push({
            title: page.title,
            content: page.description || '',
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.key)}`
          });
        }
      }

      return results;
    } catch (error) {
      console.error('调用Wikipedia API时出错:', error);
      return [];
    }
  }

  /**
   * 获取实验相关的Wikipedia知识
   */
  async getExperimentKnowledge(experimentTopic: string): Promise<string> {
    try {
      const searchResults = await this.searchWikipedia(experimentTopic, 2);
      
      if (searchResults.length === 0) {
        return `没有找到关于 "${experimentTopic}" 的相关Wikipedia信息。`;
      }

      let knowledge = `以下是关于 "${experimentTopic}" 的Wikipedia知识：\n\n`;
      
      searchResults.forEach((result, index) => {
        knowledge += `${index + 1}. **${result.title}**\n`;
        knowledge += `${result.content}\n`;
        if (result.url) {
          knowledge += `参考链接: ${result.url}\n`;
        }
        knowledge += '\n';
      });

      return knowledge;
    } catch (error) {
      console.error('获取实验知识时出错:', error);
      return `获取 "${experimentTopic}" 的Wikipedia知识时出现错误。`;
    }
  }
}

// 创建全局实例
export const wikipediaMCPClient = new WikipediaMCPClient();