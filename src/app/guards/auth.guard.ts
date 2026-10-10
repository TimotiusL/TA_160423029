import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { ApiService } from '../services/api';

export const authGuard: CanActivateFn = () => {

  const router = inject(Router);
  const api = inject(ApiService);

  const token = localStorage.getItem('token');

  // Belum login
  if (!token) {
    return router.createUrlTree(['/login']);
  }

  // Token ada, cek ke Laravel
  return api.me().pipe(
    map((response: any) => {

      const user = response.user;

      // Simpan ulang user terbaru dari Laravel
      localStorage.setItem('user', JSON.stringify(user));

      // Owner harus menggunakan akun admin
      if (user.role !== 'admin') {
        return router.createUrlTree(['/login']);
      }

      return true;
    }),

    catchError(() => {

      // Token sudah tidak valid
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      return of(router.createUrlTree(['/login']));
    })
  );
};