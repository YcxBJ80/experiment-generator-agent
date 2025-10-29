export interface AuthUser {
  id: string;
  username: string;
  email: string;
  created_at?: string;
  updated_at?: string;
  access_type?: 'software' | 'api' | null;
}

export interface AuthSuccessPayload {
  token: string;
  user: AuthUser;
}
