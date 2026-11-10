import { Injectable, signal } from '@angular/core';

export interface SplatScene {
  id: string;
  title: string;
  description: string;
  format: string;
  sourceLabel: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isScene(value: unknown): value is SplatScene {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['title'] === 'string' &&
    typeof value['description'] === 'string' &&
    typeof value['format'] === 'string' &&
    typeof value['sourceLabel'] === 'string'
  );
}

function apiError(payload: unknown, status: number): string {
  return isRecord(payload) && typeof payload['error'] === 'string'
    ? payload['error']
    : `The SplatIt service returned HTTP ${status}.`;
}

@Injectable({ providedIn: 'root' })
export class SceneCatalogService {
  readonly scenes = signal<readonly SplatScene[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private loaded = false;
  private loadRequest?: Promise<void>;

  loadScenes(): Promise<void> {
    if (this.loaded) {
      return Promise.resolve();
    }
    if (this.loadRequest) {
      return this.loadRequest;
    }

    this.loading.set(true);
    this.loadRequest = this.fetchScenes().finally(() => {
      this.loading.set(false);
      this.loadRequest = undefined;
    });
    return this.loadRequest;
  }

  async getSignedAssetUrl(sceneId: string): Promise<string> {
    const response = await fetch(`/api/splatit/scenes/${encodeURIComponent(sceneId)}/access`);
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new Error(apiError(payload, response.status));
    }
    if (
      !isRecord(payload) ||
      typeof payload['url'] !== 'string' ||
      !payload['url'].startsWith('/api/splatit/assets/')
    ) {
      throw new Error('The SplatIt service returned an invalid asset URL.');
    }

    return payload['url'];
  }

  private async fetchScenes(): Promise<void> {
    try {
      const response = await fetch('/api/splatit/scenes');
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(apiError(payload, response.status));
      }
      if (!isRecord(payload) || !Array.isArray(payload['scenes'])) {
        throw new Error('The SplatIt service returned an invalid scene list.');
      }

      const scenes = payload['scenes'].filter(isScene);
      if (scenes.length !== payload['scenes'].length) {
        throw new Error('The SplatIt service returned an invalid scene list.');
      }

      this.scenes.set(scenes);
      this.error.set(null);
      this.loaded = true;
    } catch (error) {
      console.error('Could not load SplatIt scenes from StoreIt.', error);
      this.error.set(error instanceof Error ? error.message : 'Could not load SplatIt scenes.');
    }
  }
}
