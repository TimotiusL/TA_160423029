import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { ApiService } from '../services/api';

export const guestGuard: CanActivateFn = () => {

  const router = inject(Router);
  const api = inject(ApiService);

  const token = localStorage.getItem('token');

  // Belum login → boleh masuk halaman login
  if (!token) {
    return true;
  }

  // Sudah punya token → cek ke Laravel
  return api.me().pipe(
    map((response: any) => {

      const user = response.user;

      // Token masih valid → jangan masuk login
      if (user.role === 'admin') {
        return router.createUrlTree(['/owner/dashboard']);
      }

      if (user.role === 'penghuni') {
        return router.createUrlTree(['/tenant/dashboard']);
      }

      return true;
    }),

    catchError(() => {
      // Token ternyata sudah tidak valid
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      return of(true);
    })
  );
};