import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse, User } from '../models/user.model';

const TOKEN_STORAGE_KEY = 'splatit_token';
const USER_STORAGE_KEY = 'splatit_user';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly currentUserSignal = signal<User | null>(this.readStoredUser());
  readonly currentUser = this.currentUserSignal.asReadonly();

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/login', { email, password })
      .pipe(tap((response) => this.storeAuthResponse(response)));
  }

  fetchCurrentUser(): Observable<{ user: User }> {
    return this.http
      .get<{ user: User }>('/api/auth/me')
      .pipe(tap(({ user }) => this.storeUser(user)));
  }

  updateProfile(changes: { name?: string; email?: string; password?: string }): Observable<{ user: User }> {
    return this.http
      .patch<{ user: User }>('/api/auth/me', changes)
      .pipe(tap(({ user }) => this.storeUser(user)));
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    this.currentUserSignal.set(null);
  }

  private storeAuthResponse(response: AuthResponse): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
    this.storeUser(response.user);
  }

  private storeUser(user: User): void {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    this.currentUserSignal.set(user);
  }

  private readStoredUser(): User | null {
    const value = localStorage.getItem(USER_STORAGE_KEY);
    if (!value) {
      return null;
    }

    try {
      const user: unknown = JSON.parse(value);
      if (
        typeof user === 'object' &&
        user !== null &&
        'id' in user &&
        typeof user.id === 'string' &&
        'name' in user &&
        typeof user.name === 'string' &&
        'email' in user &&
        typeof user.email === 'string'
      ) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          ...('role' in user && (user.role === 'admin' || user.role === 'user')
            ? { role: user.role }
            : {}),
        };
      }

      throw new Error('Stored user profile is invalid.');
    } catch (error: unknown) {
      console.error('Could not restore the saved SplatIt user profile:', error);
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
  }
}
