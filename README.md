# SplatIt

An embeddable Gaussian splat viewer, built in stages.

## Stage 1: rendering

This stage establishes the lazy-loaded rendering core and a Vite demo. It uses:

- `@sparkjsdev/spark` 2.4.0
- `three` 0.180.0, matching Spark's current official quick-start example and its
  `>=0.180.0` peer dependency
- Vite 8.3.7

Spark's current documentation shows `SplatLoader.loadAsync()` for progress-aware
loading, `SplatMesh` for rendering SOG/SPZ, and `SparkRenderer.onDirty` for
on-demand rendering ([loading splats](https://sparkjs.dev/docs/loading-splats/),
[SplatMesh](https://sparkjs.dev/docs/splat-mesh/),
[on-demand rendering](https://sparkjs.dev/docs/on-demand-rendering/)).
Spark's quick start and the NPM registry were checked on 2026-11-10.

## Install and run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The page lazy-loads Spark and Three.js when
the viewer is near the viewport. The demo uses Spark's publicly hosted butterfly
SPZ sample; use only non-confidential sample data in this demo. Production
project assets must use private storage and the signed-URL loader planned for
Stage 5.

```bash
npm run build
npm run preview
```

## Embedding

```js
import { createSplatViewer } from './src/viewer.js';

const viewer = createSplatViewer({
  container: document.querySelector('#project-viewer'),
  splatUrl: '/path/to/sample.spz',
  initialCamera: {
    position: [0, 0, 3],
    target: [0, 0, 0],
    fov: 50,
  },
  background: '#111820',
  accentColor: '#84d8bd',
});

// Available after rendering stage: viewer.destroy(), viewer.setView(), viewer.resetView()
```

The embedding page must give the container a non-zero height. Each viewer
instance loads its own renderer only when it approaches the viewport.

## Staged implementation status

- [x] Stage 1 — rendering, lazy loading, progress/error state, responsive sizing,
  and resource disposal
- [ ] Stage 2 — orbit controls and damping
- [ ] Stage 3 — fly mode, focus picking, and touch navigation
- [ ] Stage 4 — viewer toolbar, presets, and optional help UI
- [ ] Stage 5 — signed URLs, CORS/rate limiting, encryption option, and
  deployment guidance

Access protection is not implemented in Stage 1. Do not publish private splats
at a stable public URL or deploy this stage as a protected viewer.