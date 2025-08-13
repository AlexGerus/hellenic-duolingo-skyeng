import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/dashboard.page').then(m => m.DashboardPageComponent) },
  { path: 'login', loadComponent: () => import('./pages/login.page').then(m => m.LoginPageComponent) },
  { path: 'lesson/:id', loadComponent: () => import('./pages/lesson.page').then(m => m.LessonPageComponent) },
  { path: 'lesson/:id/rules', loadComponent: () => import('./pages/rules.page').then(m => m.RulesPageComponent) },
  { path: 'review', loadComponent: () => import('./pages/review.page').then(m => m.ReviewPageComponent) },
  { path: 'admin', loadComponent: () => import('./pages/admin.page').then(m => m.AdminPageComponent) },
  {
    path: 'leaderboard',
    loadComponent: () => import('./pages/leaderboard.page').then(m => m.LeaderboardPageComponent)
  },
  { path: '**', redirectTo: '' }
];
