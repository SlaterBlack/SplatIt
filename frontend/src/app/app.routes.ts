import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { Login } from './features/auth/login/login';
import { Shell } from './layout/shell/shell';
import { ScenesPage } from './features/scenes/scenes-page';
import { ViewerPage } from './features/viewer/viewer-page';

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
      { path: '**', redirectTo: 'scenes' },
    ],
  },
];
