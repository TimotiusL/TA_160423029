import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [guestGuard], loadComponent: () => import('./login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'owner',
    canActivate: [authGuard],

    loadComponent: () =>
      import('./owner/layout/layout.page')
        .then(m => m.LayoutPage),

    children: [

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./owner/dashboard/dashboard.page')
            .then(m => m.DashboardPage)
      },

      {
        path: 'properties',
        loadComponent: () =>
          import('./owner/properties/properties.page')
            .then(m => m.PropertiesPage)
      },

      {
        path: 'room-types',
        loadComponent: () =>
          import('./owner/room-types/room-types.page')
            .then(m => m.RoomTypesPage)
      },

      {
        path: 'rooms',
        loadComponent: () =>
          import('./owner/rooms/rooms.page')
            .then(m => m.RoomsPage)
      },

      {
        path: 'facilities',
        loadComponent: () =>
          import('./owner/facilities/facilities.page')
            .then(m => m.FacilitiesPage)
      },

      {
        path: 'registrations',
        loadComponent: () =>
          import('./owner/registrations/registrations.page')
            .then(m => m.RegistrationsPage)
      },

      {
        path: 'tenants',
        loadComponent: () =>
          import('./owner/tenants/tenants.page')
            .then(m => m.TenantsPage)
      },

      {
        path: 'contracts',
        loadComponent: () =>
          import('./owner/contracts/contracts.page')
            .then(m => m.ContractsPage)
      },

      {
        path: 'billing',
        loadComponent: () =>
          import('./owner/billing/billing.page')
            .then(m => m.BillingPage)
      },

      {
        path: 'payments',
        loadComponent: () =>
          import('./owner/payments/payments.page')
            .then(m => m.PaymentsPage)
      },

      {
        path: 'income',
        loadComponent: () =>
          import('./owner/income/income.page')
            .then(m => m.IncomePage)
      },

      {
        path: 'expenses',
        loadComponent: () =>
          import('./owner/expenses/expenses.page')
            .then(m => m.ExpensesPage)
      },

      {
        path: 'investments',
        loadComponent: () =>
          import('./owner/investments/investments.page')
            .then(m => m.InvestmentsPage)
      },

      {
        path: 'financial-analysis',
        loadComponent: () =>
          import('./owner/financial-analysis/financial-analysis.page')
            .then(m => m.FinancialAnalysisPage)
      },

      {
        path: 'complaints',
        loadComponent: () =>
          import('./owner/complaints/complaints.page')
            .then(m => m.ComplaintsPage)
      },

      {
        path: 'notifications',
        loadComponent: () =>
          import('./owner/notifications/notifications.page')
            .then(m => m.NotificationsPage)
      },

      {
        path: 'profile',
        loadComponent: () =>
          import('./owner/profile/profile.page')
            .then(m => m.ProfilePage)
      },

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }

    ]
  }
];
