import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SceneSelectionService {
  readonly selectedSceneId = signal<string | null>(null);

  select(sceneId: string | null): void {
    this.selectedSceneId.set(sceneId);
  }
}
