import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Appearance, Theme } from '../../../core/services/appearance';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  const theme = signal<Theme>('default');

  beforeEach(async () => {
    theme.set('default');
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: Appearance, useValue: { theme } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
  });

  it('applies the Retro class when Retro is selected', () => {
    theme.set('retro');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.login-page').classList).toContain('retro');
  });
});
