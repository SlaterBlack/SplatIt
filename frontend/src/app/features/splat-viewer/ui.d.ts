export type ViewerMode = 'orbit' | 'fly' | 'walk';

export interface ColorAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
}

export interface ViewerUIActions {
  getMode(): ViewerMode;
  resetView(): void;
  setColorAdjustments(settings: ColorAdjustments): void;
  setMode(mode: ViewerMode): void;
}

export interface ViewerUIHandle {
  destroy(): void;
  toggleControls(force?: boolean): void;
  toggleInfo(force?: boolean): void;
  showMessage(message: string): void;
  updateMode(mode: ViewerMode): void;
}

export declare function createViewerUI(
  container: HTMLElement,
  actions: ViewerUIActions,
): ViewerUIHandle;
