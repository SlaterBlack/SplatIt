export interface SplatViewerConfig {
  container: HTMLElement;
  splatUrl: string;
  splatFileName: string;
  initialCamera?: {
    position: [number, number, number];
    target: [number, number, number];
    fov?: number;
  };
  background?: string;
  accentColor?: string;
  minDistance?: number;
  maxDistance?: number;
  splatTransform?: {
    position?: [number, number, number];
    quaternion?: [number, number, number, number];
  };
}

export interface SplatViewerHandle {
  destroy(): void;
  setView(view: { position: number[]; target: number[]; fov?: number }): void;
  resetView(): void;
}

export declare function createSplatViewer(config: SplatViewerConfig): SplatViewerHandle;
