import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, input } from '@angular/core';

@Component({
  selector: 'app-splat-viewer',
  templateUrl: './splat-viewer.html',
  styleUrl: './splat-viewer.scss',
})
export class SplatViewer implements AfterViewInit, OnDestroy {
  @ViewChild('viewerContainer', { static: true })
  private readonly viewerContainer!: ElementRef<HTMLElement>;

  readonly splatUrl = input('https://sparkjs.dev/assets/splats/butterfly.spz');

  private destroyViewer?: () => void;

  async ngAfterViewInit(): Promise<void> {
    try {
      const { createSplatViewer } = await import('./viewer.js');
      const viewer = createSplatViewer({
        container: this.viewerContainer.nativeElement,
        splatUrl: this.splatUrl(),
        initialCamera: {
          position: [0, 0, 0],
          target: [0, 0, -3],
          fov: 60,
        },
        background: '#e9e3ef',
        accentColor: '#8b72b5',
        splatTransform: {
          position: [0, 0, -3],
          quaternion: [1, 0, 0, 0],
        },
      });
      this.destroyViewer = () => viewer.destroy();
    } catch (error) {
      console.error('Could not initialize the SplatIt viewer.', error);
    }
  }

  ngOnDestroy(): void {
    this.destroyViewer?.();
  }
}
