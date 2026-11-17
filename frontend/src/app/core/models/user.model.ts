export type UserTheme = 'default' | 'retro';
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
  theme?: UserTheme | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}
