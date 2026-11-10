import { Component } from '@angular/core';
import { SplatViewer } from './features/splat-viewer/splat-viewer';

@Component({
  selector: 'app-root',
  imports: [SplatViewer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
