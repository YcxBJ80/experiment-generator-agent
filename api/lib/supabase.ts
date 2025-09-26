import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration missing. Please check your environment variables.');
}

// Create Supabase client
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false
      }
    })
  : null;

// Database types
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

// Helper functions for database operations
export class DatabaseService {
  static async getConversations(): Promise<Conversation[]> {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty array');
      return [];
    }

    try {
      console.log('Attempting to fetch conversations from Supabase...');
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching conversations:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return [];
      }

      console.log(`Successfully fetched ${data?.length || 0} conversations`);
      return data || [];
    } catch (error) {
      console.error('Error fetching conversations:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error),
        hint: '',
        code: ''
      });
      return [];
    }
  }

  static async createConversation(title: string = 'New Conversation'): Promise<Conversation | null> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ title }])
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Database error:', error);
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
        .from('conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', id);

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
      console.log(`Attempting to fetch messages for conversation: ${conversationId}`);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase error fetching messages:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          conversationId
        });
        return [];
      }

      console.log(`Successfully fetched ${data?.length || 0} messages for conversation ${conversationId}`);
      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error),
        hint: '',
        code: '',
        conversationId
      });
      return [];
    }
  }

  static async createMessage(message: Omit<Message, 'id' | 'created_at'>): Promise<Message | null> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([message])
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

  static async updateMessage(id: string, updates: Partial<Omit<Message, 'id' | 'created_at'>>): Promise<Message | null> {
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
        .from('conversations')
        .delete()
        .eq('id', id);

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

  static async getExperimentById(experimentId: string): Promise<{ id: string; title?: string; html_content?: string } | null> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return null;
    }

    try {
      console.log(`Attempting to fetch experiment: ${experimentId}`);
      const { data, error } = await supabase
        .from('messages')
        .select('experiment_id, html_content, content')
        .eq('experiment_id', experimentId);

      if (error) {
        console.error('Error fetching experiment:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.log(`No experiment found with ID: ${experimentId}`);
        return null;
      }

      // 取第一条记录
      const experiment = data[0];
      
      return {
        id: experiment.experiment_id,
        title: 'Experiment Demo', // Can extract title from content
        html_content: experiment.html_content
      };
    } catch (error) {
      console.error('Database error:', error);
      return null;
    }
  }

  static async createSurvey(surveyData: Omit<Survey, 'id' | 'created_at'>): Promise<Survey | null> {
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