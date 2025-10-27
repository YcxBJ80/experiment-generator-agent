export interface AuthUser {
  id: string;
  username: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthSuccessPayload {
  token: string;
  user: AuthUser;
}
