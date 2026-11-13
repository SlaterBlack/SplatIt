import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { Appearance } from '../../../core/services/appearance';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private readonly auth = inject(Auth);
  readonly appearance = inject(Appearance);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  email = '';
  password = '';

  get sessionMessage(): string {
    if (this.route.snapshot.queryParamMap.has('sessionExpired')) {
      return 'Your session has expired. Sign in again to continue.';
    }
    if (this.route.snapshot.queryParamMap.has('sessionCheck')) {
      return 'We could not verify your session. Sign in to continue.';
    }
    return '';
  }

  submit(): void {
    if (!this.email.trim() || !this.password) {
      this.errorMessage.set('Enter your email and password.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const target =
          returnUrl?.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.includes('\\')
            ? returnUrl
            : '/scenes';
        void this.router.navigateByUrl(target);
      },
      error: (error: unknown) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.apiError(error));
      },
    });
  }

  private apiError(error: unknown): string {
    if (
      error instanceof HttpErrorResponse &&
      typeof error.error === 'object' &&
      error.error !== null &&
      'error' in error.error &&
      typeof error.error.error === 'string'
    ) {
      return error.error.error;
    }
    return 'Could not sign in. Check that the shared account service is available.';
  }
}
