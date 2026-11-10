# SplatIt

SplatIt is the AI3D architectural visualisation suite for presenting interactive
Gaussian splat scenes. It follows the Angular frontend and StoreIt backend
structure used by ClockIt and ManageIt, with a lavender-and-cream brand palette.

## Project layout

```text
frontend/   Angular application, Spark viewer, and same-origin StoreIt proxy
```

The shared StoreIt API runs on port `4002` by default. SplatIt's local frontend
uses port `2404`; production should proxy `/api` to StoreIt through the
frontend's Node server.

## Development

1. Start StoreIt using its backend setup instructions in
   [StoreIt's README](../StoreIt/README.md).
2. Configure and install the frontend:

   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm start
   ```

3. Open `http://localhost:2404`.

The Angular dev server proxies same-origin `/api` requests to
`STOREIT_API_URL`. The frontend never needs a database connection or database
credentials.

## Production

```bash
cd frontend
npm run build
npm run serve
```

The production server serves `dist/splatit/browser` and proxies `/api` to
StoreIt. Set `STOREIT_API_URL`, `FRONTEND_HOST`, and `FRONTEND_PORT` in
`frontend/.env`. Put the server behind the public HTTPS reverse proxy, as with
the other suites.

## Rendering stage

The first viewer stage uses:

- `@sparkjsdev/spark` 2.4.0
- `three` 0.180.0
- Angular 21 and Vite-free Angular CLI builds

Spark's current documentation shows `SplatLoader.loadAsync()` for progress-aware
loading, `SplatMesh` for SOG/SPZ, and `SparkRenderer.onDirty` for on-demand
rendering ([loading splats](https://sparkjs.dev/docs/loading-splats/),
[SplatMesh](https://sparkjs.dev/docs/splat-mesh/),
[on-demand rendering](https://sparkjs.dev/docs/on-demand-rendering/)).
The Spark quick start and package registry were checked on 2026-11-10.

The demo currently loads Spark's public butterfly SPZ sample. It is not private
or access-protected, so do not substitute confidential project files. Private
asset authorization, short-lived URLs, and storage integration must be
implemented in StoreIt before production project splats are added. StoreIt
currently has ClockIt and ManageIt namespaces; a SplatIt asset API is not yet
available.

## Planned stages

- [x] Angular frontend structure, shared-suite shell styling, lavender/cream
  tokens, and Stage 1 lazy-loaded rendering
- [ ] Orbit controls and damping
- [ ] Fly mode, focus picking, and touch navigation
- [ ] Viewer toolbar, camera presets, and help UI
- [ ] StoreIt SplatIt API, signed private asset URLs, rate limiting, encryption
  option, and deployment/CORS guidance
