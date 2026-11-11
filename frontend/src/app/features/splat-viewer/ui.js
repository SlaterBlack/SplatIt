const SVG_NS = 'http://www.w3.org/2000/svg';
let nextViewerId = 0;

const icons = {
  orbit: [
    ['circle', { cx: '12', cy: '12', r: '7' }],
    ['path', { d: 'M5 8 3 12l4 2M19 16l2-4-4-2' }],
  ],
  fly: [
    ['path', { d: 'm3 11 18-8-7 18-2-7-9-3Z' }],
    ['path', { d: 'm12 14 4-4' }],
  ],
  walk: [
    ['circle', { cx: '12', cy: '4', r: '2' }],
    ['path', { d: 'M12 8v5m-4-3 4-2 4 2m-5 3-2 7m3-7 2 7' }],
  ],
  reset: [
    ['path', { d: 'M4 11a8 8 0 1 1 2 6' }],
    ['path', { d: 'M4 5v6h6' }],
  ],
  color: [
    ['path', { d: 'M4 6h16M4 12h16M4 18h16' }],
    ['circle', { cx: '8', cy: '6', r: '2' }],
    ['circle', { cx: '15', cy: '12', r: '2' }],
    ['circle', { cx: '10', cy: '18', r: '2' }],
  ],
  controls: [
    ['rect', { x: '3', y: '5', width: '18', height: '14', rx: '2' }],
    ['path', { d: 'M7 9h2m2 0h2m2 0h2M7 13h2m2 0h2m2 0h2' }],
  ],
  info: [
    ['circle', { cx: '12', cy: '12', r: '9' }],
    ['path', { d: 'M12 11v5m0-8h.01' }],
  ],
  fullscreen: [['path', { d: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5' }]],
};

export function createViewerUI(container, actions) {
  const root = document.createElement('div');
  root.className = 'splat-viewer-ui';
  const viewerId = ++nextViewerId;

  const toolbar = document.createElement('div');
  toolbar.className = 'splat-viewer-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Splat viewer controls');

  const orbitButton = createButton('orbit', 'Orbit mode', () => actions.setMode('orbit'));
  const flyButton = createButton('fly', 'Fly mode', () => actions.setMode('fly'));
  const walkButton = createButton('walk', 'Walk mode', () => actions.setMode('walk'));
  const resetButton = createButton('reset', 'Reset camera', actions.resetView);
  const colorButton = createButton('color', 'Color settings', toggleColorSettings);
  const controlsButton = createButton('controls', 'Toggle controls legend', toggleControls);
  const infoButton = createButton('info', 'Toggle scene information', toggleInfo);
  const fullscreenButton = createButton('fullscreen', 'Toggle fullscreen', toggleFullscreen);
  controlsButton.setAttribute('aria-controls', `splat-viewer-controls-legend-${viewerId}`);
  infoButton.setAttribute('aria-controls', `splat-viewer-info-${viewerId}`);

  const legend = document.createElement('section');
  legend.className = 'splat-viewer-legend';
  legend.id = `splat-viewer-controls-legend-${viewerId}`;
  legend.hidden = true;
  legend.setAttribute('aria-label', 'Viewer controls');

  const legendHeader = document.createElement('header');
  legendHeader.className = 'splat-viewer-legend-header';
  const legendTitle = document.createElement('h3');
  const closeLegend = document.createElement('button');
  closeLegend.type = 'button';
  closeLegend.className = 'splat-viewer-legend-close';
  closeLegend.setAttribute('aria-label', 'Close controls legend');
  closeLegend.textContent = '×';
  closeLegend.addEventListener('click', () => toggleControls(false));
  legendHeader.append(legendTitle, closeLegend);

  const rows = document.createElement('div');
  rows.className = 'splat-viewer-legend-rows';
  legend.append(legendHeader, rows);

  const info = document.createElement('section');
  info.className = 'splat-viewer-info';
  info.id = `splat-viewer-info-${viewerId}`;
  info.hidden = true;
  info.setAttribute('role', 'status');
  info.textContent = 'Walk mode moves at the current height and does not have collision detection.';

  const colorPanel = document.createElement('section');
  colorPanel.className = 'splat-viewer-color-panel';
  colorPanel.id = `splat-viewer-color-settings-${viewerId}`;
  colorPanel.hidden = true;
  colorPanel.setAttribute('role', 'group');
  colorPanel.setAttribute('aria-labelledby', `splat-viewer-color-title-${viewerId}`);
  colorButton.setAttribute('aria-controls', colorPanel.id);

  const colorHeader = document.createElement('header');
  colorHeader.className = 'splat-viewer-legend-header';
  const colorTitle = document.createElement('h3');
  colorTitle.id = `splat-viewer-color-title-${viewerId}`;
  colorTitle.textContent = 'Color settings';
  const closeColorSettings = document.createElement('button');
  closeColorSettings.type = 'button';
  closeColorSettings.className = 'splat-viewer-legend-close';
  closeColorSettings.setAttribute('aria-label', 'Close color settings');
  closeColorSettings.textContent = '×';
  closeColorSettings.addEventListener('click', () => toggleColorSettings(false));
  colorHeader.append(colorTitle, closeColorSettings);

  const colorValues = { brightness: 100, contrast: 100, saturation: 100 };
  const colorControls = [];
  const colorControlDefinitions = [
    { key: 'brightness', label: 'Brightness', min: 50, max: 150 },
    { key: 'contrast', label: 'Contrast', min: 50, max: 150 },
    { key: 'saturation', label: 'Saturation', min: 0, max: 200 },
  ];
  for (const definition of colorControlDefinitions) {
    const row = document.createElement('label');
    row.className = 'splat-viewer-color-control';
    const label = document.createElement('span');
    label.textContent = definition.label;
    const output = document.createElement('output');
    output.textContent = '100%';
    const range = document.createElement('input');
    range.type = 'range';
    range.min = String(definition.min);
    range.max = String(definition.max);
    range.step = '1';
    range.value = '100';
    range.setAttribute('aria-label', definition.label);
    range.addEventListener('input', () => {
      colorValues[definition.key] = Number(range.value);
      output.textContent = `${range.value}%`;
      actions.setColorAdjustments({ ...colorValues });
    });
    row.append(label, output, range);
    colorControls.push({ key: definition.key, range, output });
    colorPanel.append(row);
  }

  const resetColorSettings = document.createElement('button');
  resetColorSettings.className = 'splat-viewer-color-reset';
  resetColorSettings.type = 'button';
  resetColorSettings.textContent = 'Reset';
  resetColorSettings.addEventListener('click', () => {
    for (const control of colorControls) {
      colorValues[control.key] = 100;
      control.range.value = '100';
      control.output.textContent = '100%';
    }
    actions.setColorAdjustments({ ...colorValues });
  });
  colorPanel.prepend(colorHeader);
  const colorNote = document.createElement('p');
  colorNote.className = 'splat-viewer-color-note';
  colorNote.textContent = 'These adjustments affect this view only.';
  colorPanel.append(colorNote);
  colorPanel.append(resetColorSettings);

  toolbar.append(
    orbitButton,
    flyButton,
    walkButton,
    resetButton,
    colorButton,
    controlsButton,
    infoButton,
    fullscreenButton,
  );
  root.append(legend, info, colorPanel, toolbar);
  container.append(root);

  function toggleControls(force) {
    legend.hidden = force === undefined ? !legend.hidden : !force;
    if (!legend.hidden) {
      toggleInfo(false);
      toggleColorSettings(false);
    }
    controlsButton.setAttribute('aria-expanded', String(!legend.hidden));
    if (!legend.hidden) {
      closeLegend.focus({ preventScroll: true });
    } else if (document.activeElement === closeLegend) {
      controlsButton.focus({ preventScroll: true });
    }
  }

  function toggleInfo(force) {
    info.hidden = force === undefined ? !info.hidden : !force;
    if (!info.hidden) {
      toggleControls(false);
      toggleColorSettings(false);
    }
    infoButton.setAttribute('aria-expanded', String(!info.hidden));
  }

  function toggleColorSettings(force) {
    colorPanel.hidden = force === undefined ? !colorPanel.hidden : !force;
    if (!colorPanel.hidden) {
      toggleControls(false);
      toggleInfo(false);
    }
    colorButton.setAttribute('aria-expanded', String(!colorPanel.hidden));
    if (!colorPanel.hidden) {
      colorControls[0].range.focus({ preventScroll: true });
    } else if (document.activeElement === closeColorSettings) {
      colorButton.focus({ preventScroll: true });
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen();
      } else if (!document.fullscreenElement && container.requestFullscreen) {
        await container.requestFullscreen();
      } else {
        throw new Error('Fullscreen is unavailable in this browser context.');
      }
    } catch (error) {
      console.error('Could not change viewer fullscreen state.', error);
      info.hidden = false;
      info.textContent = 'Fullscreen is unavailable in this browser or page context.';
      infoButton.setAttribute('aria-expanded', 'true');
    }
  }

  function renderLegend(mode) {
    legendTitle.textContent =
      mode === 'walk' ? 'Walk Mode' : mode === 'fly' ? 'Fly Mode' : 'Orbit Mode';
    orbitButton.setAttribute('aria-pressed', String(mode === 'orbit'));
    flyButton.setAttribute('aria-pressed', String(mode === 'fly'));
    walkButton.setAttribute('aria-pressed', String(mode === 'walk'));
    const entries =
      mode === 'walk'
        ? [
            ['Walk To', 'Click scene'],
            ['Look Around', 'Drag'],
            ['Fly to Point', 'Double-click'],
            ['Move', 'W A S D'],
            ['Run / Slow', 'Shift / Ctrl'],
            ['Elevation', 'Fixed height'],
            ['Reset Camera', 'R'],
            ['Exit Walk', 'Esc'],
            ['Toggle Controls', 'H'],
            ['Toggle Info', 'Shift + H'],
          ]
        : mode === 'fly'
          ? [
              ['Move', 'W A S D'],
              ['Down / up', 'Q / E'],
              ['Look', 'Drag'],
              ['Move faster / slower', 'Shift / Ctrl or Alt'],
              ['Movement speed', 'Scroll'],
              ['Fly to point', 'Double-click'],
              ['Toggle camera mode', 'V'],
              ['Frame scene', 'F'],
              ['Reset camera', 'R'],
              ['Toggle controls', 'H'],
              ['Toggle info', 'Shift + H'],
            ]
          : [
              ['Orbit', 'Left-drag'],
              ['Pan', 'Right / middle-drag or Shift + left'],
              ['Zoom', 'Scroll'],
              ['Set focus', 'Double-click scene'],
              ['Toggle camera mode', 'V'],
              ['Frame scene', 'F'],
              ['Reset camera', 'R'],
              ['Toggle controls', 'H'],
              ['Toggle info', 'Shift + H'],
            ];
    rows.replaceChildren(
      ...entries.map(([label, shortcut]) => {
        const row = document.createElement('div');
        row.className = 'splat-viewer-legend-row';
        const labelElement = document.createElement('span');
        labelElement.textContent = label;
        const shortcutElement = document.createElement('kbd');
        shortcutElement.textContent = shortcut;
        row.append(labelElement, shortcutElement);
        return row;
      }),
    );
  }

  function handleFullscreenChange() {
    fullscreenButton.setAttribute(
      'aria-label',
      document.fullscreenElement === container ? 'Exit fullscreen' : 'Enter fullscreen',
    );
  }

  const handleModeChange = (mode) => {
    renderLegend(mode);
    if (mode === 'walk') {
      toggleControls(true);
    }
  };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  controlsButton.setAttribute('aria-expanded', 'false');
  infoButton.setAttribute('aria-expanded', 'false');
  renderLegend(actions.getMode());

  return {
    destroy() {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      root.remove();
    },
    toggleControls,
    toggleInfo,
    showMessage(message) {
      info.hidden = false;
      info.textContent = message;
      infoButton.setAttribute('aria-expanded', 'true');
    },
    updateMode: handleModeChange,
  };
}

function createButton(iconName, label, onClick) {
  const button = document.createElement('button');
  button.className = 'splat-viewer-tool';
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.append(createIcon(iconName));
  button.addEventListener('click', onClick);
  return button;
}

function createIcon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const [tagName, attributes] of icons[name]) {
    const shape = document.createElementNS(SVG_NS, tagName);
    for (const [attribute, value] of Object.entries(attributes)) {
      shape.setAttribute(attribute, value);
    }
    svg.append(shape);
  }
  return svg;
}
