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
import type { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';
import type { ViewerHandle, XrMode } from '@playcanvas/supersplat-viewer/viewer';
import type { ExperienceSettings } from '@playcanvas/supersplat-viewer/settings';
import type { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';

interface ImageTargetARSession {
  mindAR?: MindARThree;
  sparkRenderer?: SparkRenderer;
  splatMesh?: SplatMesh;
  targetUrl?: string;
}

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

  @ViewChild('imageTargetDialog', { static: true })
  private readonly imageTargetDialog!: ElementRef<HTMLDialogElement>;

  @ViewChild('imageTargetStage', { static: true })
  private readonly imageTargetStage!: ElementRef<HTMLElement>;

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
  readonly imageTargetArLoading = signal(false);
  readonly imageTargetArStatus = signal('');
  readonly imageTargetArError = signal<string | null>(null);
  readonly imageTargetFound = signal(false);

  private viewer?: ViewerHandle;
  private viewInitialized = false;
  private initializationId = 0;
  private imageTargetRequestId = 0;
  private imageTargetARSession?: ImageTargetARSession;
  private compiledTargetData?: Uint8Array;
  private targetCompilation?: Promise<Uint8Array>;

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
    this.imageTargetRequestId += 1;
    this.disposeImageTargetAR(this.imageTargetARSession);
    if (this.imageTargetDialog.nativeElement.open) {
      this.imageTargetDialog.nativeElement.close();
    }
    this.destroyViewer();
  }

  async startImageTargetAR(): Promise<void> {
    if (this.imageTargetArLoading()) {
      return;
    }

    const dialog = this.imageTargetDialog.nativeElement;
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    }

    const requestId = ++this.imageTargetRequestId;
    const session: ImageTargetARSession = {};
    this.imageTargetARSession = session;
    this.imageTargetArLoading.set(true);
    this.imageTargetArStatus.set('Preparing the SplatIt image target…');
    this.imageTargetArError.set(null);
    this.imageTargetFound.set(false);

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.imageTargetArLoading.set(false);
      this.imageTargetArError.set(
        'Image-target AR requires a secure HTTPS connection and a browser with camera access.',
      );
      return;
    }

    try {
      const [{ MindARThree }, { SparkRenderer, SplatMesh }, THREE] = await Promise.all([
        import('mind-ar/dist/mindar-image-three.prod.js'),
        import('@sparkjsdev/spark'),
        import('three'),
      ]);
      if (!this.isCurrentImageTargetRequest(requestId, session)) {
        return;
      }

      const targetData = await this.getCompiledTargetData();
      if (!this.isCurrentImageTargetRequest(requestId, session)) {
        return;
      }

      const targetBuffer = new ArrayBuffer(targetData.byteLength);
      new Uint8Array(targetBuffer).set(targetData);
      session.targetUrl = URL.createObjectURL(
        new Blob([targetBuffer], { type: 'application/octet-stream' }),
      );

      const mindAR = new MindARThree({
        container: this.imageTargetStage.nativeElement,
        imageTargetSrc: session.targetUrl,
        maxTrack: 1,
        uiLoading: 'no',
        uiScanning: 'no',
        uiError: 'no',
      });
      session.mindAR = mindAR;
      mindAR.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

      const sparkRenderer = new SparkRenderer({ renderer: mindAR.renderer });
      session.sparkRenderer = sparkRenderer;
      mindAR.scene.add(sparkRenderer);

      const splatMesh = new SplatMesh({
        url: this.splatUrl(),
        fileName: this.splatFileName(),
        maxSplats: 750_000,
        onProgress: (event) => {
          if (this.isCurrentImageTargetRequest(requestId, session) && event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            this.imageTargetArStatus.set(`Loading scene… ${percent}%`);
          }
        },
      });
      session.splatMesh = splatMesh;

      const anchor = mindAR.addAnchor(0);
      anchor.group.add(splatMesh);
      anchor.onTargetFound = () => {
        if (this.isCurrentImageTargetRequest(requestId, session)) {
          this.imageTargetFound.set(true);
        }
      };
      anchor.onTargetLost = () => {
        if (this.isCurrentImageTargetRequest(requestId, session)) {
          this.imageTargetFound.set(false);
        }
      };

      this.imageTargetArStatus.set('Requesting camera access and loading the scene…');
      await Promise.all([mindAR.start(), splatMesh.initialized]);
      if (!this.isCurrentImageTargetRequest(requestId, session)) {
        this.disposeImageTargetAR(session);
        return;
      }

      this.fitSplatToTarget(splatMesh, THREE);
      this.imageTargetArStatus.set('Point the camera at the SplatIt target card.');
      this.imageTargetArLoading.set(false);
    } catch (error) {
      this.disposeImageTargetAR(session);
      if (requestId !== this.imageTargetRequestId) {
        return;
      }

      console.error('Could not start image-target AR.', error);
      this.imageTargetArError.set(this.getImageTargetARError(error));
      this.imageTargetArLoading.set(false);
    }
  }

  endImageTargetAR(): void {
    this.imageTargetRequestId += 1;
    this.disposeImageTargetAR(this.imageTargetARSession);
    this.imageTargetArLoading.set(false);
    this.imageTargetArStatus.set('');
    this.imageTargetArError.set(null);
    this.imageTargetFound.set(false);

    const dialog = this.imageTargetDialog.nativeElement;
    if (dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
  }

  cancelImageTargetAR(event: Event): void {
    event.preventDefault();
    this.endImageTargetAR();
  }

  private async initializeViewer(): Promise<void> {
    const initializationId = ++this.initializationId;
    this.destroyViewer();
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

  private async getCompiledTargetData(): Promise<Uint8Array> {
    if (this.compiledTargetData) {
      return this.compiledTargetData;
    }

    if (!this.targetCompilation) {
      const compilation = (async () => {
        const { Compiler } = await import('mind-ar/dist/mindar-image.prod.js');
        const image = new Image();
        image.src = new URL('assets/splatit-ar-target.svg', document.baseURI).href;
        await image.decode();

        const compiler = new Compiler();
        await compiler.compileImageTargets([image], (progress) => {
          if (this.imageTargetArLoading() && this.imageTargetDialog.nativeElement.open) {
            this.imageTargetArStatus.set(`Preparing image target… ${Math.round(progress)}%`);
          }
        });
        this.compiledTargetData = compiler.exportData();
        return this.compiledTargetData;
      })();
      this.targetCompilation = compilation;
      void compilation.catch(() => {
        if (this.targetCompilation === compilation) {
          this.targetCompilation = undefined;
        }
      });
    }

    return this.targetCompilation;
  }

  private isCurrentImageTargetRequest(requestId: number, session: ImageTargetARSession): boolean {
    return requestId === this.imageTargetRequestId && this.imageTargetARSession === session;
  }

  private fitSplatToTarget(mesh: SplatMesh, three: typeof import('three')): void {
    const bounds = mesh.getBoundingBox();
    if (bounds.isEmpty()) {
      throw new Error('The selected scene does not contain renderable splats.');
    }

    const size = bounds.getSize(new three.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
      throw new Error('The selected scene has invalid dimensions for image-target AR.');
    }

    const center = bounds.getCenter(new three.Vector3());
    const scale = 0.65 / maxDimension;
    mesh.scale.setScalar(scale);
    mesh.position.set(-center.x * scale, -center.y * scale, -center.z * scale + 0.03);
  }

  private getImageTargetARError(error: unknown): string {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        return 'Camera access was denied. Allow camera access for SplatIt in your browser settings, then try again.';
      }
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        return 'No camera was found on this device.';
      }
    }

    const cause = error instanceof Error ? error.message : 'Unknown AR startup error.';
    return `Could not start image-target AR. ${cause}`;
  }

  private disposeImageTargetAR(session?: ImageTargetARSession): void {
    if (!session) {
      return;
    }

    session.splatMesh?.dispose();
    session.sparkRenderer?.dispose();
    session.mindAR?.controller?.dispose();

    const stream = session.mindAR?.video?.srcObject;
    if (typeof MediaStream !== 'undefined' && stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    session.mindAR?.video?.remove();
    session.mindAR?.renderer.dispose();
    session.mindAR?.renderer.domElement.remove();
    session.mindAR?.cssRenderer.domElement.remove();
    if (session.targetUrl) {
      URL.revokeObjectURL(session.targetUrl);
    }

    if (this.imageTargetARSession === session) {
      this.imageTargetARSession = undefined;
    }
  }

  private applyBackgroundColor(): void {
    const viewer = this.viewer;
    if (!viewer || viewer.state.xrMode === 'ar') {
      return;
    }

    const cameras = viewer.app.root.findComponents('camera');
    if (cameras.length === 0) {
      console.error(
        'Could not update the SplatIt background because the viewer camera is missing.',
      );
      return;
    }

    const color = hexToRgb(this.backgroundColor());
    for (const camera of cameras) {
      camera.camera.clearColor.set(...color);
    }
    viewer.app.renderNextFrame = true;
  }
}
