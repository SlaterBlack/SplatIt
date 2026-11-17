import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Users } from './users';

describe('Users', () => {
  let component: Users;
  let fixture: ComponentFixture<Users>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Users],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    fixture = TestBed.createComponent(Users);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads and lists users', () => {
    httpMock.expectOne('/api/users').flush({
      users: [
        { id: 'u1', name: 'Ada Admin', email: 'ada@example.com', role: 'admin' },
        { id: 'u2', name: 'Uma User', email: 'uma@example.com', role: 'user' },
      ],
    });
    fixture.detectChanges();

    expect(component.users()).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Ada Admin');
    expect(fixture.nativeElement.textContent).toContain('Uma User');
  });

  it('creates a user and adds it to the list', () => {
    httpMock.expectOne('/api/users').flush({ users: [] });
    component.newName.set('New Person');
    component.newEmail.set('new@example.com');
    component.newPassword.set('longenough');
    component.createUser();

    const request = httpMock.expectOne({
      method: 'POST',
      url: '/api/users',
    });
    expect(request.request.body).toEqual({
      name: 'New Person',
      email: 'new@example.com',
      password: 'longenough',
      role: 'user',
    });
    request.flush({
      user: {
        id: 'u3',
        name: 'New Person',
        email: 'new@example.com',
        role: 'user',
      },
    });

    expect(component.users().map((user) => user.id)).toContain('u3');
    expect(component.newName()).toBe('');
  });

  it('does not call the API when required fields are missing', () => {
    httpMock.expectOne('/api/users').flush({ users: [] });
    component.createUser();

    httpMock.expectNone({ method: 'POST', url: '/api/users' });
    expect(component.createError()).toContain('required');
  });
});
