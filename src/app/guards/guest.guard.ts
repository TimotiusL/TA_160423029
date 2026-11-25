import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { ApiService } from '../services/api';

export const guestGuard: CanActivateFn = () => {

  const router = inject(Router);
  const api = inject(ApiService);

  const token = localStorage.getItem('token');

  if (!token) {
    return true;
  }

  return api.me().pipe(
    map((response: any) => {

      const user = response.user;

      if (user.role === 'admin') {
        return router.createUrlTree(['/owner/dashboard']);
      }

      if (user.role === 'penghuni') {
        return router.createUrlTree(['/tenant/dashboard']);
      }

      return true;
    }),

    catchError(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      return of(true);
    })
  );
};