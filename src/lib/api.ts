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
  is_conversation_root?: boolean;
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
      const eventData: string[] = [];
      let hasLoggedCompletion = false;

      const flushEvent = (): boolean => {
        if (!eventData.length) {
          return false;
        }
        const text = eventData.join('\n');
        eventData.length = 0;

        if (text === '[DONE]') {
          return true;
        }

        chunkCount++;
        console.log(`📦 Received chunk ${chunkCount}:`, text.substring(0, 50) + '...');
        onChunk(text);
        return false;
      };

      const processLine = (rawLine: string): boolean => {
        if (rawLine === '') {
          return flushEvent();
        }

        if (rawLine.startsWith('data:')) {
          let value = rawLine.slice(5);
          if (value.startsWith(' ')) {
            value = value.slice(1);
          }
          eventData.push(value);
        }
        return false;
      };

      try {
        let shouldStop = false;

        while (!shouldStop) {
          const { done, value } = await reader.read();

          if (value) {
            buffer += decoder.decode(value, { stream: true });
          }

          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (processLine(line)) {
              shouldStop = true;
              break;
            }
          }

          if (shouldStop) {
            break;
          }

          if (done) {
            if (buffer) {
              if (processLine(buffer)) {
                break;
              }
              buffer = '';
            }
            // Ensure any buffered event is delivered
            processLine('');
            console.log('✅ Streaming data reading completed, total chunks:', chunkCount);
            hasLoggedCompletion = true;
            break;
          }
        }
      } finally {
        reader.releaseLock();
      }

      if (!hasLoggedCompletion) {
        console.log('✅ Streaming data reading completed, total chunks:', chunkCount);
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
    return this.request<Conversation[]>('/messages/conversations');
  }

  /**
   * Create new conversation
   */
  async createConversation(title?: string): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'New Conversation' }),
    });
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(id: string, title: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/messages/conversations/${id}/title`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  }

  /**
   * Delete conversation
   */
  async deleteConversation(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/messages/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get messages of conversation
   */
  async getMessages(conversationId: string): Promise<ApiResponse<Message[]>> {
    return this.request<Message[]>(`/messages/conversations/${conversationId}/messages`);
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

// Conversations API (now handled by messages API)
export const conversationsApi = {
  getAll: async (): Promise<Conversation[]> => {
    const response = await fetch('/api/messages/conversations');
    if (!response.ok) {
      throw new Error('Failed to fetch conversations');
    }
    return response.json();
  },

  create: async (title: string): Promise<Conversation> => {
    const response = await fetch('/api/messages/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      throw new Error('Failed to create conversation');
    }
    return response.json();
  },

  updateTitle: async (id: string, title: string): Promise<void> => {
    const response = await fetch(`/api/messages/conversations/${id}/title`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      throw new Error('Failed to update conversation title');
    }
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/messages/conversations/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
  },
};

// Messages API
export const messagesApi = {
  getByConversation: async (conversationId: string): Promise<Message[]> => {
    const response = await fetch(`/api/messages/conversations/${conversationId}/messages`);
    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }
    return response.json();
  },

  create: async (conversationId: string, message: Omit<Message, 'id' | 'created_at'>): Promise<Message> => {
    const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    if (!response.ok) {
      throw new Error('Failed to create message');
    }
    return response.json();
  },

  sendMessage: async (conversationId: string, content: string, experimentId?: string): Promise<ReadableStream> => {
    const response = await fetch('/api/messages/generate-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: content,
        conversationId,
        experimentId
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.body!;
  },
};

export const apiClient = new ApiClient();
