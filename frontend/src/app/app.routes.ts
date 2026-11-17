import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { Login } from './features/auth/login/login';
import { Shell } from './layout/shell/shell';
import { ScenesPage } from './features/scenes/scenes-page';
import { ViewerPage } from './features/viewer/viewer-page';
import { Profile } from './features/profile/profile';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'scenes' },
      { path: 'scenes', component: ScenesPage },
      { path: 'viewer', component: ViewerPage },
      { path: 'viewer/:sceneId', component: ViewerPage },
      { path: 'profile', component: Profile },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/users/users').then((m) => m.Users),
      },
      { path: '**', redirectTo: 'scenes' },
    ],
  },
];
