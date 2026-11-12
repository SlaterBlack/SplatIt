import { computed, Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'splatit_viewer_background';

export const VIEWER_BACKGROUND_OPTIONS = [
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Light lavender', value: '#9B8AC4' },
] as const;

export type ViewerBackgroundColor = (typeof VIEWER_BACKGROUND_OPTIONS)[number]['value'];

const DEFAULT_BACKGROUND: ViewerBackgroundColor = '#000000';
const BACKGROUND_LABELS: Record<ViewerBackgroundColor, string> = {
  '#000000': 'Black',
  '#FFFFFF': 'White',
  '#9B8AC4': 'Light lavender',
};

function isViewerBackgroundColor(color: string): color is ViewerBackgroundColor {
  return VIEWER_BACKGROUND_OPTIONS.some((option) => option.value === color.toUpperCase());
}

function readBackgroundColor(): ViewerBackgroundColor {
  const storedColor = localStorage.getItem(STORAGE_KEY);
  if (storedColor === null) {
    return DEFAULT_BACKGROUND;
  }
  const normalizedColor = storedColor.toUpperCase();
  if (isViewerBackgroundColor(normalizedColor)) {
    return normalizedColor;
  }

  console.error('Stored SplatIt viewer background is unsupported; resetting it to black.');
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_BACKGROUND;
}

@Injectable({ providedIn: 'root' })
export class Appearance {
  readonly backgroundOptions = VIEWER_BACKGROUND_OPTIONS;
  readonly viewerBackgroundColor = signal<ViewerBackgroundColor>(readBackgroundColor());
  readonly viewerBackgroundName = computed(() => BACKGROUND_LABELS[this.viewerBackgroundColor()]);

  setViewerBackgroundColor(color: string): void {
    const normalizedColor = color.toUpperCase();
    if (!isViewerBackgroundColor(normalizedColor)) {
      throw new Error('Viewer background color must be one of the available options.');
    }

    localStorage.setItem(STORAGE_KEY, normalizedColor);
    this.viewerBackgroundColor.set(normalizedColor);
  }
}
