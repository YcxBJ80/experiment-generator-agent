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
  experiment_id?: string;
  html_content?: string;
  css_content?: string;
  js_content?: string;
  is_conversation_root?: boolean;
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

      const status = response.status;

      if (!response.ok) {
        const text = await response.text();
        let message = text || response.statusText;
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error) {
            message = parsed.error;
          }
        } catch (err) {
          // ignore JSON parse error
        }
        return { success: false, error: message, status };
      }

      const data = await response.json();
      if (data && typeof data === 'object' && 'success' in data) {
        return { ...(data as ApiResponse<T>), status };
      }

      return { success: true, data: data as T, status };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network request failed',
      };
    }
  }

  async generateExperimentStream(
    request: ExperimentGenerateRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/messages/generate-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    const processLine = (line: string) => {
      if (line === '') {
        const text = buffer.trim();
        buffer = '';
        if (text === '[DONE]') {
          return true;
        }
        if (text) {
          onChunk(text);
        }
        return false;
      }

      if (line.startsWith('data:')) {
        buffer += `${line.slice(5).trim()}`;
      }
      return false;
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split(/\r?\n/);
      for (const line of lines) {
        const shouldStop = processLine(line);
        if (shouldStop) {
          return;
        }
      }
    }
  }

  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    return this.request<Conversation[]>(`/messages/conversations`);
  }

  async createConversation(title: string): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async updateConversationTitle(id: string, title: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/messages/conversations/${id}/title`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  }

  async deleteConversation(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/messages/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  async getMessages(conversationId: string): Promise<ApiResponse<Message[]>> {
    return this.request<Message[]>(`/messages/conversations/${conversationId}/messages`);
  }

  async createMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<ApiResponse<Message>> {
    return this.request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  async updateMessage(id: string, updates: Partial<Omit<Message, 'id' | 'created_at'>>): Promise<ApiResponse<Message>> {
    return this.request<Message>(`/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getExperiment(id: string): Promise<ApiResponse<ExperimentData>> {
    return this.request<ExperimentData>(`/messages/${id}`);
  }

  async submitSurvey(surveyData: SurveySubmitRequest): Promise<ApiResponse<{ survey_id: string; message: string }>> {
    return this.request<{ survey_id: string; message: string }>('/messages/surveys', {
      method: 'POST',
      body: JSON.stringify(surveyData),
    });
  }
}

export const apiClient = new ApiClient();
