import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { Auth } from '../services/auth';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (!auth.getToken()) {
    return router.createUrlTree(['/login']);
  }

  return auth.fetchCurrentUser().pipe(
    map(({ user }) => (user.role === 'admin' ? true : router.createUrlTree(['/scenes']))),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && [401, 403, 404].includes(error.status)) {
        auth.logout();
      } else {
        console.error('Could not verify SplatIt admin access.', error);
      }
      return of(router.createUrlTree(['/login']));
    }),
  );
};
