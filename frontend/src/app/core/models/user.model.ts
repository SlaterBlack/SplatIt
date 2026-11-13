export type UserTheme = 'default' | 'retro';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'user';
  theme?: UserTheme | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}
