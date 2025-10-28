import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase configuration missing. Please check your environment variables.');
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    })
  : null;

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id?: string | null;
  messages?: Message[];
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

export class DatabaseService {
  static async getConversations(): Promise<Conversation[]> {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty array');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('is_conversation_root', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching conversations:', error);
        return [];
      }

      return (data || []).map((msg) => ({
        id: msg.conversation_id,
        title: msg.title || 'New Conversation',
        created_at: msg.created_at,
        updated_at: msg.updated_at || msg.created_at,
        user_id: msg.user_id ?? null,
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  static async createConversation(title: string = 'New Conversation'): Promise<Conversation | null> {
    if (!supabase) {
      console.warn('Supabase not configured, returning null');
      return null;
    }

    try {
      const conversationId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            conversation_id: conversationId,
            content: '',
            type: 'assistant',
            title,
            is_conversation_root: true,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return null;
      }

      return {
        id: conversationId,
        title,
        created_at: data.created_at,
        updated_at: data.updated_at || data.created_at,
        user_id: data.user_id ?? null,
      };
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  static async updateConversationTitle(id: string, title: string): Promise<boolean> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return false;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .update({ title })
        .eq('conversation_id', id)
        .eq('is_conversation_root', true);

      if (error) {
        console.error('Error updating conversation title:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Database error:', error);
      return false;
    }
  }

  static async getMessages(conversationId: string): Promise<Message[]> {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty array');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase error fetching messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  static async createMessage(
    message: Omit<Message, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Message | null> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return null;
    }

    try {
      const messageData = {
        ...message,
        conversation_id: message.conversation_id || crypto.randomUUID(),
        is_conversation_root: message.is_conversation_root || false,
      };

      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        console.error('Error creating message:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error:', error);
      return null;
    }
  }

  static async updateMessage(
    id: string,
    updates: Partial<Omit<Message, 'id' | 'created_at'>>
  ): Promise<Message | null> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating message:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error:', error);
      return null;
    }
  }

  static async deleteConversation(id: string): Promise<boolean> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return false;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', id);

      if (error) {
        console.error('Error deleting conversation:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Database error:', error);
      return false;
    }
  }

  static async getExperimentById(
    experimentId: string
  ): Promise<{ id: string; title?: string; html_content?: string } | null> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return null;
    }

    if (!experimentId) {
      console.warn('Experiment id missing when fetching experiment');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('experiment_id, html_content, content')
        .eq('experiment_id', experimentId);

      if (error) {
        console.error('Error fetching experiment:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const experiment = data[0];

      return {
        id: experiment.experiment_id,
        title: 'Experiment Demo',
        html_content: experiment.html_content,
      };
    } catch (error) {
      console.error('Database error:', error);
      return null;
    }
  }

  static async createSurvey(
    surveyData: Omit<Survey, 'id' | 'created_at'>
  ): Promise<Survey | null> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('surveys')
        .insert([surveyData])
        .select()
        .single();

      if (error) {
        console.error('Error creating survey:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error:', error);
      return null;
    }
  }
}
