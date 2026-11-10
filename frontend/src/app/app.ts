import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SceneSelectionService } from './features/scenes/scene-selection.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly sceneSelection = inject(SceneSelectionService);

  get viewerLink(): string[] {
    const sceneId = this.sceneSelection.selectedSceneId();
    return sceneId ? ['/viewer', sceneId] : ['/viewer'];
  }
}
