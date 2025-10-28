import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase configuration missing. Please check your environment variables.');
}

// Create Supabase client
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey, {
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

// Helper functions for database operations
export class DatabaseService {
  static async getConversations(userId: string): Promise<Conversation[]> {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty array');
      return [];
    }

    if (!userId) {
      console.warn('User id missing when fetching conversations');
      return [];
    }

    try {
      console.log('Attempting to fetch conversations from messages table for user:', userId);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('is_conversation_root', true)
        .eq('user_id', userId)
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

      const conversations: Conversation[] = (data || []).map(msg => ({
        id: msg.conversation_id,
        title: msg.title || 'New Conversation',
        created_at: msg.created_at,
        updated_at: msg.updated_at || msg.created_at,
        user_id: msg.user_id
      }));

      console.log(`Successfully fetched ${conversations.length} conversations`);
      return conversations;
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

  static async createConversation(title: string = 'New Conversation', userId: string): Promise<Conversation | null> {
    if (!supabase) {
      console.warn('Supabase not configured, returning null');
      return null;
    }

    if (!userId) {
      console.warn('User id missing when creating conversation');
      return null;
    }

    try {
      console.log('Creating new conversation with title:', title, 'for user:', userId);
      const conversationId = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from('messages')
        .insert([{ 
          conversation_id: conversationId,
          content: '',
          type: 'assistant',
          title,
          is_conversation_root: true,
          user_id: userId
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return null;
      }

      const conversation: Conversation = {
        id: conversationId,
        title,
        created_at: data.created_at,
        updated_at: data.updated_at || data.created_at,
        user_id: userId
      };

      console.log('Successfully created conversation:', conversation);
      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  static async updateConversationTitle(id: string, title: string, userId: string): Promise<boolean> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return false;
    }

    if (!userId) {
      console.warn('User id missing when updating conversation title');
      return false;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .update({ title })
        .eq('conversation_id', id)
        .eq('is_conversation_root', true)
        .eq('user_id', userId);

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

  static async getMessages(conversationId: string, userId: string): Promise<Message[]> {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty array');
      return [];
    }

    if (!userId) {
      console.warn('User id missing when fetching messages');
      return [];
    }

    try {
      console.log(`Attempting to fetch messages for conversation: ${conversationId}, user: ${userId}`);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
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

  static async createMessage(
    message: Omit<Message, 'id' | 'created_at' | 'updated_at'> & { user_id: string }
  ): Promise<Message | null> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return null;
    }

    if (!message.user_id) {
      console.warn('User id missing when creating message');
      return null;
    }

    try {
      // Ensure conversation_id is set, use experiment_id as fallback
      const messageData = {
        ...message,
        conversation_id: message.conversation_id || message.experiment_id || crypto.randomUUID(),
        is_conversation_root: message.is_conversation_root || false
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
    updates: Partial<Omit<Message, 'id' | 'created_at'>>,
    userId?: string
  ): Promise<Message | null> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return null;
    }

    try {
      let query = supabase
        .from('messages')
        .update(updates)
        .eq('id', id);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.select().single();

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

  static async deleteConversation(id: string, userId: string): Promise<boolean> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return false;
    }

    if (!userId) {
      console.warn('User id missing when deleting conversation');
      return false;
    }

    try {
      // Delete all messages in the conversation (including the root message)
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting conversation messages:', error);
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

      // Use the first matching record
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
