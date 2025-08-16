import { Routes } from '@angular/router';
import { authGuard } from '../shared/guards/auth.guard';
import { adminGuard } from '../shared/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardPage)
  },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.LoginPage) },
  {
    path: 'lesson/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/lesson/lesson').then(m => m.LessonPage)
  },
  {
    path: 'lesson/:id/rules',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/rules/rules').then(m => m.RulesPage)
  },
  {
    path: 'review',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/review/review').then(m => m.ReviewPage)
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/admin/admin').then(m => m.AdminPage)
  },
  {
    path: 'leaderboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/leaderboard/leaderboard').then(m => m.LeaderboardPage)
  },
  { path: '**', redirectTo: '' }
];
