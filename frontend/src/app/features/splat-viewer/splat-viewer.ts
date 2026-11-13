import {
  AfterViewInit,
  Component,
  ElementRef,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  input,
  signal,
} from '@angular/core';
import type { ViewerHandle, XrMode } from '@playcanvas/supersplat-viewer/viewer';
import type { ExperienceSettings } from '@playcanvas/supersplat-viewer/settings';

function hexToRgb(color: string): [number, number, number] {
  if (!/^#[\da-f]{6}$/i.test(color)) {
    throw new Error('Viewer background color must be a six-digit hex color.');
  }

  return [
    Number.parseInt(color.slice(1, 3), 16) / 255,
    Number.parseInt(color.slice(3, 5), 16) / 255,
    Number.parseInt(color.slice(5, 7), 16) / 255,
  ];
}

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
  readonly collisionUrl = input<string | null>(null);
  readonly backgroundColor = input('#000000');
  readonly isLoaded = signal(false);
  readonly hasCollision = signal(false);
  readonly walkAllowed = signal(false);
  readonly loadingProgress = signal(0);
  readonly errorMessage = signal<string | null>(null);
  readonly canStartAR = signal(false);
  readonly canStartVR = signal(false);
  readonly hasAR = signal(false);
  readonly hasVR = signal(false);
  readonly xrMode = signal<XrMode | null>(null);
  readonly xrRequestPending = signal(false);
  readonly xrError = signal<string | null>(null);
  readonly isExpanded = signal(false);

  private viewer?: ViewerHandle;
  private viewInitialized = false;
  private initializationId = 0;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    void this.initializeViewer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewInitialized) {
      return;
    }

    if (Object.keys(changes).every((key) => key === 'backgroundColor')) {
      this.applyBackgroundColor();
      return;
    }

    void this.initializeViewer();
  }

  ngOnDestroy(): void {
    this.initializationId += 1;
    this.destroyViewer();
  }

  async toggleFullscreen(): Promise<void> {
    if (this.isExpanded()) {
      this.isExpanded.set(false);
      return;
    }

    const viewer = this.viewer;
    if (!viewer) {
      return;
    }

    try {
      await viewer.requestFullscreen();
    } catch (error) {
      console.warn('Native fullscreen is unavailable; using the expanded viewer layout.', error);
      this.isExpanded.set(true);
    }
  }

  private async initializeViewer(): Promise<void> {
    const initializationId = ++this.initializationId;
    this.destroyViewer();
    this.isExpanded.set(false);
    this.isLoaded.set(false);
    this.hasCollision.set(false);
    this.walkAllowed.set(false);
    this.loadingProgress.set(0);
    this.errorMessage.set(null);
    this.canStartAR.set(false);
    this.canStartVR.set(false);
    this.hasAR.set(false);
    this.hasVR.set(false);
    this.xrMode.set(null);
    this.xrRequestPending.set(false);
    this.xrError.set(null);

    try {
      const [{ createViewer }, { defaultSettings }] = await Promise.all([
        import('@playcanvas/supersplat-viewer/viewer'),
        import('@playcanvas/supersplat-viewer/settings'),
      ]);
      if (initializationId !== this.initializationId) {
        return;
      }

      const settings = defaultSettings('environment') as ExperienceSettings;
      settings.highPrecisionRendering = true;
      settings.background.color = hexToRgb(this.backgroundColor());
      settings.cameras[0].initial = {
        position: [0, 0, 3],
        target: [0, 0, 0],
        fov: 60,
      };

      const collisionUrl = this.collisionUrl();
      const viewer = await createViewer({
        container: this.viewerContainer.nativeElement,
        contentUrl: this.splatUrl(),
        contentFilename: this.splatFileName(),
        ...(collisionUrl ? { collisionUrl } : {}),
        settings,
        hpr: true,
        renderer: 'webgpu',
        ui: true,
      });
      if (initializationId !== this.initializationId) {
        viewer.destroy();
        return;
      }

      this.viewer = viewer;
      this.applyBackgroundColor();
      const updateState = () => {
        this.isLoaded.set(viewer.state.loaded);
        this.hasCollision.set(viewer.state.hasCollision);
        this.walkAllowed.set(viewer.state.walkAllowed);
        this.loadingProgress.set(viewer.state.progress);
        this.canStartAR.set(viewer.state.canStartAR);
        this.canStartVR.set(viewer.state.canStartVR);
        this.hasAR.set(viewer.state.hasAR);
        this.hasVR.set(viewer.state.hasVR);
        this.xrMode.set(viewer.state.xrMode);
      };
      viewer.events.on('loaded:changed', updateState);
      viewer.events.on('hasCollision:changed', updateState);
      viewer.events.on('walkAllowed:changed', updateState);
      viewer.events.on('progress:changed', updateState);
      viewer.events.on('canStartAR:changed', updateState);
      viewer.events.on('canStartVR:changed', updateState);
      viewer.events.on('hasAR:changed', updateState);
      viewer.events.on('hasVR:changed', updateState);
      viewer.events.on('xrMode:changed', updateState);
      viewer.events.on('xrMode:changed', () => this.applyBackgroundColor());
      updateState();
    } catch (error) {
      if (initializationId === this.initializationId) {
        console.error('Could not initialize the SuperSplat viewer.', error);
        this.errorMessage.set(this.getInitializationErrorMessage(error));
      }
    }
  }

  private getInitializationErrorMessage(error: unknown): string {
    const cause = error instanceof Error ? error.message : 'Unknown viewer initialization error.';
    if (!/webgl|webgpu|graphics|context|adapter|device/i.test(cause)) {
      return cause;
    }

    const canvas = document.createElement('canvas');
    const webgl2 = canvas.getContext('webgl2');
    const webgl2Available = webgl2 !== null;
    webgl2?.getExtension('WEBGL_lose_context')?.loseContext();
    const webgpuApiAvailable = 'gpu' in navigator;

    return `Could not create a graphics device. WebGL 2: ${
      webgl2Available ? 'available' : 'unavailable'
    }; WebGPU API: ${webgpuApiAvailable ? 'detected' : 'not detected'}; secure context: ${
      window.isSecureContext ? 'yes' : 'no'
    }. ${cause}`;
  }

  startXR(mode: XrMode): void {
    const viewer = this.viewer;
    if (!viewer) {
      return;
    }

    const canStart = mode === 'ar' ? viewer.state.canStartAR : viewer.state.canStartVR;
    if (!viewer.state.loaded || !canStart) {
      this.xrError.set(`${mode.toUpperCase()} mode is not available in this browser.`);
      return;
    }

    void this.runXRAction(
      () => viewer.startXR(mode),
      `Could not start ${mode.toUpperCase()} mode.`,
    );
  }

  endXR(): void {
    const viewer = this.viewer;
    if (viewer) {
      void this.runXRAction(() => viewer.endXR(), 'Could not end the immersive session.');
    }
  }

  private async runXRAction(action: () => Promise<void>, errorMessage: string): Promise<void> {
    this.xrRequestPending.set(true);
    this.xrError.set(null);
    try {
      await action();
    } catch (error) {
      console.error(errorMessage, error);
      this.xrError.set(error instanceof Error ? `${errorMessage} ${error.message}` : errorMessage);
    } finally {
      this.xrRequestPending.set(false);
    }
  }

  private destroyViewer(): void {
    this.viewer?.destroy();
    this.viewer = undefined;
  }

  private applyBackgroundColor(): void {
    const viewer = this.viewer;
    if (!viewer || viewer.state.xrMode === 'ar') {
      return;
    }

    const cameras = viewer.app.root.findComponents('camera');
    if (cameras.length === 0) {
      console.error('Could not update the SplatIt background because the viewer camera is missing.');
      return;
    }

    const color = hexToRgb(this.backgroundColor());
    for (const camera of cameras) {
      camera.camera.clearColor.set(...color);
    }
    viewer.app.renderNextFrame = true;
  }
}
