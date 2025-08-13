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
    // Initialize client
  }

  /**
   * Connect to Wikipedia MCP server
   */
  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        return;
      }

      console.log('Starting Wikipedia MCP server...');
      
      // Set proxy environment variables
      const env = {
        ...process.env,
        https_proxy: 'http://127.0.0.1:7890',
        http_proxy: 'http://127.0.0.1:7890',
        all_proxy: 'socks5://127.0.0.1:7890'
      };

      // Create transport layer
      this.transport = new StdioClientTransport({
        command: 'wikipedia-mcp',
        args: ['--language', 'en'],
        env
      });

      // Create client
      this.client = new Client({
        name: 'wikipedia-client',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      // Connect to server
      await this.client.connect(this.transport);
      this.isConnected = true;
      
      console.log('Wikipedia MCP client connected successfully');
    } catch (error) {
      console.error('Failed to connect to Wikipedia MCP server:', error);
      // If MCP connection fails, fallback to direct API calls
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    try {
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }
      this.client = null;
      this.isConnected = false;
      console.log('Wikipedia MCP client disconnected');
    } catch (error) {
      console.error('Error disconnecting Wikipedia MCP connection:', error);
    }
  }

  /**
   * Search Wikipedia articles
   */
  async searchWikipedia(query: string, limit: number = 3): Promise<WikipediaSearchResult[]> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      if (this.client && this.isConnected) {
        // Use MCP tool to search
        const searchResult = await this.client.callTool({
          name: 'search_wikipedia',
          arguments: {
            query,
            limit
          }
        });

        console.log('MCP search successful');
        
        // Based on actual testing, search_wikipedia returns content array
        if (searchResult.content && Array.isArray(searchResult.content)) {
          const results: WikipediaSearchResult[] = [];
          
          // Parse search results
          const searchText = searchResult.content.map((c: any) => c.text || c).join(' ');
          
          try {
            // Try to parse JSON format search results
            const searchData = JSON.parse(searchText);
            
            if (searchData.results && Array.isArray(searchData.results)) {
              for (const item of searchData.results.slice(0, limit)) {
                // Get summary for each article
                try {
                  const summaryResult = await this.client.callTool({
                    name: 'get_summary',
                    arguments: {
                      title: item.title
                    }
                  });
                  
                  let content = '';
                  if (summaryResult.content && Array.isArray(summaryResult.content)) {
                    // Extract summary text
                    const summaryText = summaryResult.content.map((c: any) => c.text || c).join(' ');
                    try {
                      // Try to parse JSON format summary
                      const summaryData = JSON.parse(summaryText);
                      content = summaryData.summary || summaryText;
                    } catch {
                      // If not JSON, use text directly
                      content = summaryText;
                    }
                  } else {
                    // Fallback to search snippet
                    content = item.snippet ? item.snippet.replace(/<[^>]*>/g, '') : 'No summary';
                  }
                  
                  results.push({
                    title: item.title,
                    content: content,
                    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`
                  });
                } catch (summaryError) {
                  console.error(`Failed to get summary for article ${item.title}:`, summaryError);
                  // If getting summary fails, use search snippet
                  results.push({
                    title: item.title,
                    content: item.snippet ? item.snippet.replace(/<[^>]*>/g, '') : 'No summary',
                    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`
                  });
                }
              }
            }
          } catch (parseError) {
            console.error('Failed to parse search results JSON:', parseError);
            // If parsing fails, use text content directly
            results.push({
              title: query,
              content: searchText,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/ /g, '_'))}`
            });
          }
          
          return results;
        }
      }

      // If MCP fails, fallback to API mode
      return await this.searchWikipediaAPI(query, limit);
    } catch (error) {
      console.error('Error searching Wikipedia:', error);
      // Fallback to API mode
      return await this.searchWikipediaAPI(query, limit);
    }
  }

  /**
   * Search using Wikipedia API (as alternative to MCP)
   */
  private async searchWikipediaAPI(query: string, limit: number): Promise<WikipediaSearchResult[]> {
    try {
      // Search related articles
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/search?q=${encodeURIComponent(query)}&limit=${limit}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (!searchData.pages || searchData.pages.length === 0) {
        return [];
      }

      const results: WikipediaSearchResult[] = [];

      // Get detailed content for each article
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
          console.error(`Error getting content for article ${page.title}:`, error);
          // If getting detailed content fails, at least keep basic info
          results.push({
            title: page.title,
            content: page.description || '',
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.key)}`
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error calling Wikipedia API:', error);
      return [];
    }
  }

  /**
   * Get Wikipedia knowledge related to experiments
   */
  async getExperimentKnowledge(experimentTopic: string): Promise<string> {
    try {
      const searchResults = await this.searchWikipedia(experimentTopic, 2);
      
      if (searchResults.length === 0) {
        return `No relevant Wikipedia information found for "${experimentTopic}".`;
      }

      let knowledge = `Here is Wikipedia knowledge about "${experimentTopic}":\n\n`;
      
      searchResults.forEach((result, index) => {
        knowledge += `${index + 1}. **${result.title}**\n`;
        knowledge += `${result.content}\n`;
        if (result.url) {
          knowledge += `Reference link: ${result.url}\n`;
        }
        knowledge += '\n';
      });

      return knowledge;
    } catch (error) {
      console.error('Error getting experiment knowledge:', error);
      return `Error occurred while getting Wikipedia knowledge for "${experimentTopic}".`;
    }
  }
}

// Create global instance
export const wikipediaMCPClient = new WikipediaMCPClient();