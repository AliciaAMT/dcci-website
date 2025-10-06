import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin-guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'welcome',
    loadComponent: () => import('./welcome/welcome.page').then( m => m.WelcomePage)
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./admin/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'admin/verify-email',
    loadComponent: () => import('./admin/verify-email/verify-email.page').then( m => m.VerifyEmailPage)
  },
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./admin/dashboard/dashboard.page').then( m => m.DashboardPage),
    canActivate: [adminGuard]
  },
  {
    path: 'admin/forgot-password',
    loadComponent: () => import('./admin/forgot-password/forgot-password.page').then( m => m.ForgotPasswordPage)
  },
  {
    path: 'admin/reset-password',
    loadComponent: () => import('./admin/reset-password/reset-password.page').then( m => m.ResetPasswordPage)
  },



];
