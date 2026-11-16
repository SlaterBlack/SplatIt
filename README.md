# SplatIt

SplatIt is the AI3D architectural visualisation suite for presenting interactive
Gaussian splat scenes. It follows the Angular frontend and StoreIt backend
structure used by ClockIt and ManageIt, with a lavender-and-cream brand palette.

## Project layout

```text
frontend/   Angular application, SuperSplat viewer, and same-origin StoreIt proxy
```

The app opens on the **Scenes** tab, where available splats are shown as cards.
Selecting one opens it in the **Viewer** tab. Scene files are listed from the
StoreIt API, which reads the configured scene root. Visitors sign in with their
shared StoreIt account; SplatIt uses its own
lavender-and-cream login screen and SplatIt logo.
The account menu provides app installation, account profile editing, Guides,
and Appearance. Themes include **Default** and **Retro**, which uses a
terminal-style VT323 typeface, square corners, and a dark purple phosphor
palette. The appearance dialog also
retains the independent viewer-background selector. The production frontend
includes a web app manifest and service worker for supported browser installs.

Configure `STOREIT_API_URL`, `FRONTEND_HOST`, and `FRONTEND_PORT` in
`frontend/.env` for this environment. Production should proxy `/api` to StoreIt
through the frontend's Node server.

The brand palette is Lavender `#9B8AC4`, Cream `#F5EBD8`, and Deep purple
`#5B497F`.

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

3. Open the development URL printed by the server. To test from another device,
   bind the server to a trusted network interface and use the development
   machine's network address.

The experimental image-target AR implementation is currently not exposed in
the viewer UI. Camera access requires HTTPS if that feature is re-enabled.

The frontend skips dependency lifecycle scripts because MindAR's browser runtime
does not use its native `canvas` dependency. The frontend build/start commands
also apply a small Three.js color-space compatibility patch to MindAR 1.2.5.

The Angular dev server proxies same-origin `/api` requests to
`STOREIT_API_URL`. The frontend never needs a database connection or database
credentials.

## Network scene library

StoreIt lists scene files from the directory configured by
`SPLATIT_SCENE_ROOT`. Mount only the intended scene library there, read-only,
and give the StoreIt service account read-only access to that directory. Keep
SMB server/share names and mount credentials in the host's mount configuration
and protected credentials file, not in this README or application source.

The API lists supported `.ply`, `.sog`, `.spz`, and `.ksplat` files directly
inside the configured directory and one level of project subfolders. SuperSplat
`.html` exports are also listed and displayed in a sandboxed iframe. The API
does not scan deeper or follow directory links.

The SplatIt viewer uses the official SuperSplat Viewer package, with WebGPU
when available, automatic WebGL fallback, and high-precision rendering. To
enable its walk mode, place an offline-generated collision mesh beside its
source splat using the `<scene-name>.collision.glb` suffix; for example,
`WBH_AMB.collision.glb` beside `WBH_AMB.sog`. StoreIt only checks for, signs,
and serves that optional sidecar. Collision generation is not performed by
StoreIt. Without a sidecar, orbit and fly modes remain available and the viewer
explains that walking is unavailable.

Configure StoreIt's `backend/.env` using
[`backend/.env.example`](../StoreIt/backend/.env.example). Set
`SPLATIT_SCENE_ROOT`, `SPLATIT_ALLOWED_ORIGINS`, `SPLATIT_SIGNING_SECRET`,
`CLIENT_ORIGINS`, and `TRUST_PROXY` for the deployment. Use exact origins in
the allowlists and trust only the reverse proxy addresses required by the
deployment. The production proxy must forward the client IP so StoreIt's
per-visitor rate limit is applied correctly.

StoreIt exposes `GET /api/splatit/scenes` for the grid,
`GET /api/splatit/scenes/:id/access` for a signed scene URL,
`GET /api/splatit/scenes/:id/collision/access` for an optional signed collision
URL, and asset endpoints for each. Scene listing and signed-URL issuance require
a valid bearer token from the shared StoreIt login system and an allowed
`Origin` or `Referer`. The viewer fetches scene files using their signed URLs,
which expire after five minutes and are checked against the allowed origins.
The frontend calls these routes through its same-origin `/api` proxy.

Authentication gates SplatIt's pages and scene API, but it does not make viewed
files confidential: an authenticated visitor can inspect or capture downloaded
scene data, and a copied signed URL remains usable until it expires. Do not
treat this as DRM. The current implementation does not encrypt splats.
Configure the public reverse proxy with
`Content-Security-Policy: frame-ancestors 'self'` (or an explicit trusted parent
allowlist) to prevent other sites from framing the SplatIt page. Mount
availability, file permissions, DNS, and allowed origins must be verified in
the deployment environment.

## Production

```bash
cd frontend
npm run build
npm run serve
```

The production server serves `dist/splatit/browser` and proxies `/api` to
StoreIt. Set `STOREIT_API_URL`, `FRONTEND_HOST`, and `FRONTEND_PORT` in
`frontend/.env`. Bind to a network interface appropriate for the deployment;
restrict direct access with the host firewall and put public access behind an
HTTPS reverse proxy. After backend authentication changes, rebuild StoreIt
and restart its backend service so the protected routes take effect.

## Rendering

The viewer uses the official
[`@playcanvas/supersplat-viewer`](https://github.com/playcanvas/supersplat-viewer)
package and requests high-precision rendering. It chooses WebGPU when supported
and falls back to WebGL; its built-in UI includes camera modes, walk controls
when collision data is available, and color grading. Compression can reduce
transfer size and can introduce quantization, but a renderer's precision,
anti-aliasing, and post-processing can also affect perceived banding. The
viewer can load either `.sog` or `.ply` so they can be compared on the same
renderer; the original PLY may be much larger. SplatIt hides fullscreen and
AR/VR controls in its native viewer UI; sandboxed `.html` exports may provide
their own controls. The experimental MindAR image-target implementation
remains in the code but is not accessible from the viewer while a markerless
placement approach is being evaluated.

## Planned stages

- [x] Angular frontend structure, shared-suite shell styling, lavender/cream
      tokens, and SuperSplat Viewer integration
- [x] WebGPU rendering with WebGL fallback, high-precision rendering, and
      SuperSplat built-in color-grading controls
- [ ] Markerless AR placement suitable for mobile browsers
- [x] Signed optional collision sidecars for browser-side SuperSplat walk mode
- [ ] Viewer camera presets
- [x] StoreIt scene listing and signed asset URLs, origin allowlist, rate
      limiting, and deployment guidance
- [x] Shared ClockedIn sign-in, SplatIt-branded login, and authenticated scene
      listing and signed-URL issuance
- [ ] Optional AES-GCM encryption and remaining CDN/CORS deployment validation
