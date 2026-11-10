import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { SplatViewer } from '../splat-viewer/splat-viewer';
import { SceneCatalogService, SplatScene } from '../scenes/scene-catalog';
import { SceneSelectionService } from '../scenes/scene-selection.service';

@Component({
  selector: 'app-viewer-page',
  imports: [RouterLink, SplatViewer],
  templateUrl: './viewer-page.html',
  styleUrl: './viewer-page.scss',
})
export class ViewerPage implements OnInit, OnDestroy {
  readonly scene = signal<SplatScene | undefined>(undefined);
  readonly signedSplatUrl = signal<string | null>(null);
  readonly trustedHtmlUrl = computed(() => {
    const url = this.signedSplatUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });
  readonly loadingScene = signal(false);
  readonly error = signal<string | null>(null);

  private routeSubscription?: Subscription;
  private sceneRequestId = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly sceneSelection: SceneSelectionService,
    private readonly catalog: SceneCatalogService,
    private readonly sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      const sceneId = params.get('sceneId') ?? this.sceneSelection.selectedSceneId();
      this.sceneSelection.select(sceneId);
      void this.loadScene(sceneId);
    });
  }

  ngOnDestroy(): void {
    this.sceneRequestId += 1;
    this.routeSubscription?.unsubscribe();
  }

  private async loadScene(sceneId: string | null): Promise<void> {
    const requestId = ++this.sceneRequestId;
    this.scene.set(undefined);
    this.signedSplatUrl.set(null);
    this.error.set(null);

    if (!sceneId) {
      this.loadingScene.set(false);
      return;
    }

    this.loadingScene.set(true);
    try {
      await this.catalog.loadScenes();
      if (requestId !== this.sceneRequestId) {
        return;
      }

      const selectedScene = this.catalog.scenes().find((item) => item.id === sceneId);
      if (!selectedScene) {
        this.error.set(
          this.catalog.error() ?? 'This scene is no longer available in the project library.',
        );
        return;
      }

      this.scene.set(selectedScene);
      const signedUrl = await this.catalog.getSignedAssetUrl(sceneId);
      if (requestId === this.sceneRequestId) {
        this.signedSplatUrl.set(signedUrl);
      }
    } catch (error) {
      if (requestId === this.sceneRequestId) {
        console.error('Could not prepare the selected SplatIt scene.', error);
        this.error.set(error instanceof Error ? error.message : 'Could not load this scene.');
      }
    } finally {
      if (requestId === this.sceneRequestId) {
        this.loadingScene.set(false);
      }
    }
  }
}
