declare module 'mind-ar/dist/mindar-image.prod.js' {
  export class Compiler {
    compileImageTargets(
      images: HTMLImageElement[],
      progressCallback: (progress: number) => void,
    ): Promise<unknown>;
    exportData(): Uint8Array;
  }
}

declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  export class MindARThree {
    constructor(options: {
      container: HTMLElement;
      imageTargetSrc: string;
      maxTrack?: number;
      uiLoading?: 'yes' | 'no';
      uiScanning?: 'yes' | 'no';
      uiError?: 'yes' | 'no';
    });

    readonly scene: import('three').Scene;
    readonly renderer: import('three').WebGLRenderer;
    readonly video?: HTMLVideoElement;
    readonly cssRenderer: { readonly domElement: HTMLElement };
    readonly controller?: { dispose(): void };

    addAnchor(targetIndex: number): {
      group: import('three').Group;
      onTargetFound: (() => void) | null;
      onTargetLost: (() => void) | null;
    };
    start(): Promise<void>;
  }
}
