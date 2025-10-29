import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';

export interface UserProfileRecord {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
  access_type?: 'software' | 'api' | null;
}

export type PublicUserProfile = Omit<UserProfileRecord, 'password_hash'>;

function handleSupabaseNotConfigured(): null {
  console.warn('Supabase is not configured – user operations are unavailable.');
  return null;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) {
    return false;
  }

  const hashedBuffer = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');

  if (hashedBuffer.length !== keyBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashedBuffer, keyBuffer);
}

export class UserService {
  static async findByEmail(email: string): Promise<UserProfileRecord | null> {
    if (!supabase) {
      return handleSupabaseNotConfigured();
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, email, password_hash, created_at, updated_at, access_type')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error fetching user by email:', error);
      }
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      ...data,
      email: data.email.toLowerCase()
    };
  }

  static async findByUsername(username: string): Promise<UserProfileRecord | null> {
    if (!supabase) {
      return handleSupabaseNotConfigured();
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, email, password_hash, created_at, updated_at, access_type')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error fetching user by username:', error);
      }
      return null;
    }

    return data ?? null;
  }

  static async findById(id: string): Promise<PublicUserProfile | null> {
    if (!supabase) {
      return handleSupabaseNotConfigured();
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, email, created_at, updated_at, access_type')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error fetching user by id:', error);
      }
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      ...data,
      email: data.email.toLowerCase()
    };
  }

  static async createUser(
    input: Pick<UserProfileRecord, 'username' | 'email' | 'password_hash'>
  ): Promise<PublicUserProfile | null> {
    if (!supabase) {
      return handleSupabaseNotConfigured();
    }

    const payload = {
      username: input.username,
      email: input.email.toLowerCase(),
      password_hash: input.password_hash
    };

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([payload])
        .select('id, username, email, created_at, updated_at, access_type')
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        throw error;
      }

      return {
        ...data,
        email: data.email.toLowerCase()
      };
    } catch (error) {
      console.error('Database error while creating user profile:', error);
      const code = typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : undefined;

      if (code === 'PGRST205') {
        throw new Error(
          'Supabase table user_profiles is missing. Run the latest migrations (see supabase/migrations/20251028000000_ensure_user_profiles_table.sql) and reload the schema.'
        );
      }

      throw error;
    }
  }
}
