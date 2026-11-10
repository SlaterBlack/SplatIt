import {
  AfterViewInit,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  ViewChild,
  input,
} from '@angular/core';

@Component({
  selector: 'app-splat-viewer',
  templateUrl: './splat-viewer.html',
  styleUrl: './splat-viewer.scss',
})
export class SplatViewer implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('viewerContainer', { static: true })
  private readonly viewerContainer!: ElementRef<HTMLElement>;

  readonly splatUrl = input.required<string>();
  readonly splatFileName = input.required<string>();

  private destroyViewer?: () => void;
  private viewInitialized = false;
  private initializationId = 0;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    void this.initializeViewer();
  }

  ngOnChanges(): void {
    if (this.viewInitialized) {
      void this.initializeViewer();
    }
  }

  ngOnDestroy(): void {
    this.initializationId += 1;
    this.destroyViewer?.();
  }

  private async initializeViewer(): Promise<void> {
    const initializationId = ++this.initializationId;
    this.destroyViewer?.();
    this.destroyViewer = undefined;
    try {
      const { createSplatViewer } = await import('./viewer.js');
      if (initializationId !== this.initializationId) {
        return;
      }
      const viewer = createSplatViewer({
        container: this.viewerContainer.nativeElement,
        splatUrl: this.splatUrl(),
        splatFileName: this.splatFileName(),
        initialCamera: {
          position: [0, 0, 0],
          target: [0, 0, -3],
          fov: 60,
        },
        background: '#eee9f6',
        accentColor: '#5B497F',
        splatTransform: {
          position: [0, 0, -3],
          quaternion: [1, 0, 0, 0],
        },
      });
      if (initializationId !== this.initializationId) {
        viewer.destroy();
        return;
      }
      this.destroyViewer = () => viewer.destroy();
    } catch (error) {
      if (initializationId === this.initializationId) {
        console.error('Could not initialize the SplatIt viewer.', error);
      }
    }
  }
}
