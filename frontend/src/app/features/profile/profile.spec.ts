import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '../../core/services/auth';
import { Profile } from './profile';

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.removeItem('splatit_token');
    localStorage.removeItem('splatit_user');
    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads and updates the signed-in user profile', () => {
    http.expectOne((request) => request.url.endsWith('/auth/me')).flush({
      user: {
        id: 'u1',
        name: 'Sam',
        email: 'sam@example.com',
        role: 'user',
      },
    });

    component.name.set('Sam Black');
    component.email.set('sam.black@example.com');
    component.password.set('newpassword');
    component.save();

    const request = http.expectOne(
      (candidate) => candidate.method === 'PATCH' && candidate.url.endsWith('/auth/me'),
    );
    expect(request.request.body).toEqual({
      name: 'Sam Black',
      email: 'sam.black@example.com',
      password: 'newpassword',
    });
    request.flush({
      user: {
        id: 'u1',
        name: 'Sam Black',
        email: 'sam.black@example.com',
        role: 'user',
      },
    });

    expect(component.currentUser()?.name).toBe('Sam Black');
    expect(component.successMessage()).toContain('updated');
    expect(component.password()).toBe('');
  });
});
