import { useAuthStore } from '@/hooks/useAuth';
import type { AuthSuccessPayload, AuthUser } from '@/types/auth';

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
  status?: number;
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

export interface CaptchaChallenge {
  id: string;
  svg: string;
  expiresIn: number;
}

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return useAuthStore.getState().token;
};

const buildAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(),
        ...(options.headers as Record<string, string> | undefined),
      };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const status = response.status;
      const responseText = await response.text();

      if (!response.ok) {
        if (responseText) {
          try {
            const errorData = JSON.parse(responseText);
            if (status === 401 && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('app:unauthorized'));
            }
            return {
              success: false,
              error: errorData.error || `HTTP ${status}: ${response.statusText}`,
              status,
            };
          } catch {
            if (status === 401 && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('app:unauthorized'));
            }
            return {
              success: false,
              error: `HTTP ${status}: ${responseText}`,
              status,
            };
          }
        }

        if (status === 401 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:unauthorized'));
        }

        return {
          success: false,
          error: `HTTP ${status}: ${response.statusText}`,
          status,
        };
      }

      if (!responseText) {
        return {
          success: true,
          status,
        };
      }

      try {
        const data = JSON.parse(responseText);
        
        if (data && typeof data === 'object' && 'success' in data) {
          return {
            ...(data as ApiResponse<T>),
            status,
          };
        }

        return {
          success: true,
          data: data as T,
          status,
        };
      } catch {
        return {
          success: true,
          data: responseText as unknown as T,
          status,
        };
      }
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network request failed',
        status: undefined,
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
          ...buildAuthHeaders(),
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
   * Authentication helpers
   */
  async getCaptcha(): Promise<ApiResponse<CaptchaChallenge>> {
    return this.request<CaptchaChallenge>('/auth/captcha');
  }

  async register(
    payload: {
      username: string;
      email: string;
      password: string;
      confirmPassword: string;
      captchaId: string;
      captchaAnswer: string;
    }
  ): Promise<ApiResponse<AuthSuccessPayload>> {
    return this.request<AuthSuccessPayload>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async login(
    payload: { email: string; password: string; captchaId: string; captchaAnswer: string }
  ): Promise<ApiResponse<AuthSuccessPayload>> {
    return this.request<AuthSuccessPayload>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    return this.request<AuthUser>('/auth/me');
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
    const response = await fetch('/api/messages/conversations', {
      headers: {
        ...buildAuthHeaders(),
      }
    });
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
        ...buildAuthHeaders(),
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
        ...buildAuthHeaders(),
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
      headers: {
        ...buildAuthHeaders(),
      }
    });
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
  },
};

// Messages API
export const messagesApi = {
  getByConversation: async (conversationId: string): Promise<Message[]> => {
    const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
      headers: {
        ...buildAuthHeaders(),
      }
    });
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
        ...buildAuthHeaders(),
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
        ...buildAuthHeaders(),
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
