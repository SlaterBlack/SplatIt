export interface User {
  id: string;
  name: string;
  email: string;
  role?: 'admin' | 'user';
}

export interface AuthResponse {
  token: string;
  user: User;
}
