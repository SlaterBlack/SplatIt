import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { User as UserModel, UserRole } from '../models/user.model';

export interface ManagedUser extends Omit<UserModel, 'role'> {
  role: UserRole;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  role?: UserRole;
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class User {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/users';

  list(): Observable<{ users: ManagedUser[] }> {
    return this.http.get<{ users: ManagedUser[] }>(this.apiUrl);
  }

  create(payload: CreateUserPayload): Observable<{ user: ManagedUser }> {
    return this.http.post<{ user: ManagedUser }>(this.apiUrl, payload);
  }

  update(id: string, changes: UpdateUserPayload): Observable<{ user: ManagedUser }> {
    return this.http.patch<{ user: ManagedUser }>(
      `${this.apiUrl}/${encodeURIComponent(id)}`,
      changes,
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${encodeURIComponent(id)}`);
  }
}
