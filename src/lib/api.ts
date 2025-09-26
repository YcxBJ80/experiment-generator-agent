const API_BASE_URL = '/api';

export interface ExperimentGenerateRequest {
  prompt: string;
  conversation_id?: string;
  message_id?: string;
  model?: string;
}

export interface ExperimentData {
  experiment_id: string;
  html_content: string;
  css_content: string;
  js_content: string;
  parameters: Array<{
    name: string;
    type: string;
    min?: number;
    max?: number;
    default: any;
    description: string;
  }>;
  status: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  type: 'user' | 'assistant';
  experiment_id?: string;
  html_content?: string;
  css_content?: string;
  js_content?: string;
  created_at: string;
}

export interface Survey {
  id: string;
  experiment_id: string;
  reflects_real_world: boolean;
  visualization_rating: number;
  concept_understanding: number;
  suggestions: string;
  created_at: string;
}

export interface SurveySubmitRequest {
  experiment_id: string;
  reflects_real_world: boolean;
  visualization_rating: number;
  concept_understanding: number;
  suggestions: string;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        try {
          // First read response text
          const responseText = await response.text();
          try {
            // Try to parse as JSON
            const errorData = JSON.parse(responseText);
            return {
              success: false,
              error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
            };
          } catch (jsonError) {
            // If not JSON format, use response text directly
            return {
              success: false,
              error: `HTTP ${response.status}: ${responseText || response.statusText}`,
            };
          }
        } catch (textError) {
          return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
          };
        }
      }

      const data = await response.json();
      
      // Check if backend already returns ApiResponse format
      if (data && typeof data === 'object' && 'success' in data) {
        return data as ApiResponse<T>;
      }
      
      // Backend returns data directly, need to wrap as ApiResponse format
      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network request failed',
      };
    }
  }

  /**
   * Generate experiment (streaming response)
   */
  async generateExperimentStream(
    request: ExperimentGenerateRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    console.log('🚀 Starting streaming API call:', request);
    try {
      const response = await fetch(`${API_BASE_URL}/messages/generate-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      console.log('📡 Received response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        console.error('❌ Response body is not readable');
        throw new Error('Response body is not readable');
      }

      console.log('📖 Starting to read streaming data...');
      const decoder = new TextDecoder();
      let buffer = '';
      let chunkCount = 0;
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ Streaming data reading completed, total chunks:', chunkCount);
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() && line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data !== '[DONE]') {
                chunkCount++;
                console.log(`📦 Received chunk ${chunkCount}:`, data.substring(0, 50) + '...');
                onChunk(data);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Streaming API request failed:', error);
      throw error;
    }
  }

  /**
   * Get experiment details
   */
  async getExperiment(id: string): Promise<ApiResponse<ExperimentData>> {
    return this.request<ExperimentData>(`/experiments/${id}`);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/health');
  }

  /**
   * Get all conversations
   */
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    return this.request<Conversation[]>('/conversations');
  }

  /**
   * Create new conversation
   */
  async createConversation(title?: string): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'New Conversation' }),
    });
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(id: string, title: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  }

  /**
   * Delete conversation
   */
  async deleteConversation(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get messages of conversation
   */
  async getMessages(conversationId: string): Promise<ApiResponse<Message[]>> {
    return this.request<Message[]>(`/conversations/${conversationId}/messages`);
  }

  /**
   * Create message
   */
  async createMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<ApiResponse<Message>> {
    return this.request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  /**
   * Submit survey for experiment
   */
  async submitSurvey(surveyData: SurveySubmitRequest): Promise<ApiResponse<{ survey_id: string; message: string }>> {
    return this.request<{ survey_id: string; message: string }>('/experiments/survey', {
      method: 'POST',
      body: JSON.stringify(surveyData),
    });
  }
}

export const apiClient = new ApiClient();