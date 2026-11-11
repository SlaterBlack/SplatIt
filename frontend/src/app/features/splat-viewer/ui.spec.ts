import { createViewerUI } from './ui.js';

describe('Splat viewer UI color settings', () => {
  it('updates and resets view-only brightness, contrast, and saturation', () => {
    const container = document.createElement('div');
    const updates: Array<{ brightness: number; contrast: number; saturation: number }> = [];
    const ui = createViewerUI(container, {
      getMode: () => 'orbit',
      resetView: () => {},
      setColorAdjustments: (settings) => updates.push(settings),
      setMode: () => {},
    });

    expect(container.querySelectorAll('.splat-viewer-tool')).toHaveLength(8);
    (container.querySelector('[aria-label="Color settings"]') as HTMLButtonElement).click();
    const panel = container.querySelector('.splat-viewer-color-panel') as HTMLElement;
    expect(panel.hidden).toBe(false);

    const saturation = panel.querySelector('[aria-label="Saturation"]') as HTMLInputElement;
    saturation.value = '150';
    saturation.dispatchEvent(new Event('input'));
    expect(updates.at(-1)).toEqual({ brightness: 100, contrast: 100, saturation: 150 });

    (panel.querySelector('.splat-viewer-color-reset') as HTMLButtonElement).click();
    expect(updates.at(-1)).toEqual({ brightness: 100, contrast: 100, saturation: 100 });
    expect(saturation.value).toBe('100');

    ui.destroy();
  });
});
