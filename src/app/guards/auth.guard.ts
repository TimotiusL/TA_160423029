
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { ApiService } from '../services/api';

export const authGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const api = inject(ApiService);

  const token = localStorage.getItem('token');

  if (!token) {
    return router.createUrlTree(['/login']);
  }

  return api.me().pipe(
    map((response: any) => {
      const user = response.user;

      localStorage.setItem('user', JSON.stringify(user));

      const expectedRole = route.routeConfig?.path === 'tenant'
        ? 'penghuni'
        : 'admin';

      if (user.role !== expectedRole) {
        return router.createUrlTree(['/login']);
      }

      return true;
    }),
    catchError(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      return of(router.createUrlTree(['/login']));
    })
  );
};
