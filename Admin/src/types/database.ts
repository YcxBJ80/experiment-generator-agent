export interface UserProfile {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
  access_type?: 'software' | 'api' | null;
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
  title?: string;
  is_conversation_root?: boolean;
  user_id?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Survey {
  id: string;
  experiment_id: string;
  reflects_real_world: boolean;
  visualization_rating: number;
  concept_understanding: number;
  suggestions: string;
  created_at: string;
  user_id?: string | null;
}

export interface UserStats {
  userId: string;
  username: string;
  email: string;
  messageCount: number;
  lastActiveAt: string;
  createdAt: string;
  accessType?: 'software' | 'api' | null;
}

