import { Routes } from '@angular/router';
import { ScenesPage } from './features/scenes/scenes-page';
import { ViewerPage } from './features/viewer/viewer-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'scenes' },
  { path: 'scenes', component: ScenesPage },
  { path: 'viewer', component: ViewerPage },
  { path: 'viewer/:sceneId', component: ViewerPage },
  { path: '**', redirectTo: 'scenes' },
];
