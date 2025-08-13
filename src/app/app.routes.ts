import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardPage) },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.LoginPage) },
  { path: 'lesson/:id', loadComponent: () => import('./pages/lesson/lesson').then(m => m.LessonPage) },
  { path: 'lesson/:id/rules', loadComponent: () => import('./pages/rules/rules').then(m => m.RulesPage) },
  { path: 'review', loadComponent: () => import('./pages/review/review').then(m => m.ReviewPage) },
  { path: 'admin', loadComponent: () => import('./pages/admin/admin').then(m => m.AdminPage) },
  {
    path: 'leaderboard',
    loadComponent: () => import('./pages/leaderboard/leaderboard').then(m => m.LeaderboardPage)
  },
  { path: '**', redirectTo: '' }
];
