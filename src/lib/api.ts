const API_BASE_URL = '/api';

export interface ExperimentGenerateRequest {
  prompt: string;
  conversation_id?: string;
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
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      
      // 检查后端是否已经返回ApiResponse格式
      if (data && typeof data === 'object' && 'success' in data) {
        return data as ApiResponse<T>;
      }
      
      // 后端直接返回数据，需要包装成ApiResponse格式
      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      console.error('API请求失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '网络请求失败',
      };
    }
  }

  /**
   * 生成实验
   */
  async generateExperiment(
    request: ExperimentGenerateRequest
  ): Promise<ApiResponse<ExperimentData>> {
    return this.request<ExperimentData>('/experiments/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * 获取实验详情
   */
  async getExperiment(id: string): Promise<ApiResponse<ExperimentData>> {
    return this.request<ExperimentData>(`/experiments/${id}`);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/health');
  }

  /**
   * 获取所有对话
   */
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    return this.request<Conversation[]>('/conversations');
  }

  /**
   * 创建新对话
   */
  async createConversation(title?: string): Promise<ApiResponse<Conversation>> {
    return this.request<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'New Conversation' }),
    });
  }

  /**
   * 更新对话标题
   */
  async updateConversationTitle(id: string, title: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  }

  /**
   * 删除对话
   */
  async deleteConversation(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * 获取对话的消息
   */
  async getMessages(conversationId: string): Promise<ApiResponse<Message[]>> {
    return this.request<Message[]>(`/conversations/${conversationId}/messages`);
  }

  /**
   * 创建消息
   */
  async createMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<ApiResponse<Message>> {
    return this.request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }
}

export const apiClient = new ApiClient();