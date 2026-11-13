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
StoreIt API, which reads `\\192.168.1.11\max resources\GaussianSplats`.
Visitors sign in with their existing ClockedIn account; SplatIt uses its own
lavender-and-cream login screen and SplatIt logo.
The account menu provides app installation, account profile editing, Guides,
and Appearance. Themes include **Default** and **Retro**, which uses a
terminal-style VT323 typeface, square corners, and a dark purple phosphor
palette. The appearance dialog also
retains the independent viewer-background selector. The production frontend
includes a web app manifest and service worker for supported browser installs.

The shared StoreIt API runs on port `4002` by default. SplatIt's local frontend
uses port `2404`; production should proxy `/api` to StoreIt through the
frontend's Node server.

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

3. Open `http://localhost:2404` on the server, or
   `http://<server-lan-ip>:2404` from another device on the same network.

The Angular dev server proxies same-origin `/api` requests to
`STOREIT_API_URL`. The frontend never needs a database connection or database
credentials.

## Network scene library

The StoreIt host should mount only the `GaussianSplats` subdirectory, read-only,
at the path configured by `SPLATIT_SCENE_ROOT` (default
`/MaxResources/GaussianSplats`). CIFS `prefixpath` makes that directory the
mount root, so StoreIt cannot browse the rest of the share through this mount.
Also use an SMB account with read-only permission limited to this directory:

The full share is currently mounted at `/MaxResources`; stop StoreIt and
unmount that view before replacing it with the restricted mount:

```bash
sudo systemctl stop storeit-backend.service
sudo umount /MaxResources
sudo mkdir -p /MaxResources/GaussianSplats
sudo mount -t cifs "//192.168.1.11/max resources" /MaxResources/GaussianSplats \
  -o credentials=/etc/samba/bluey.credentials,ro,vers=3.0,prefixpath=GaussianSplats,nosuid,nodev,noexec
sudo systemctl start storeit-backend.service
```

The credentials file should be root-owned with mode `600`; enter the SMB
username and password there (plus `domain=...` if required). Do not paste
credentials into chat or commit the file. Configure that SMB account itself
with read-only access limited to `GaussianSplats` as an additional security
boundary. The API lists supported `.ply`, `.sog`, `.spz`, and `.ksplat` files
directly inside the configured directory and one level of project subfolders.
SuperSplat `.html` exports are also listed and displayed in a sandboxed iframe.
The API does not scan deeper or follow directory links.

The SplatIt viewer uses the official SuperSplat Viewer package, with WebGPU
when available, automatic WebGL fallback, and high-precision rendering. To
enable its walk mode, place an offline-generated collision mesh beside its
source splat using the `<scene-name>.collision.glb` suffix; for example,
`WBH_AMB.collision.glb` beside `WBH_AMB.sog`. StoreIt only checks for, signs,
and serves that optional sidecar. Collision generation is not performed by
StoreIt. Without a sidecar, orbit and fly modes remain available and the viewer
explains that walking is unavailable.

Configure StoreIt's `backend/.env`:

```dotenv
SPLATIT_SCENE_ROOT=/MaxResources/GaussianSplats
SPLATIT_ALLOWED_ORIGINS=http://localhost:2404,https://<your-splatit-domain>
SPLATIT_SIGNING_SECRET=<unique-random-secret-at-least-32-characters>
CLIENT_ORIGINS=http://localhost:2400,http://localhost:2401,http://localhost:2402,http://localhost:2404,https://<your-splatit-domain>
TRUST_PROXY=loopback
```

Use the exact frontend origins (scheme, hostname, and port, with no path) and
include each deployed origin in both allowlists. Replace the sample production
domain. `TRUST_PROXY=loopback` is appropriate when StoreIt is only reachable on
localhost through the SplatIt frontend proxy; for a different reverse proxy,
trust only that proxy's address or subnet. The production proxy forwards the
client IP so StoreIt's 120-requests-per-minute limit is applied per visitor.

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
availability, file permissions, DNS, and production origins must be verified
on the StoreIt host; the current development machine did not have the Bluey
share mounted.

## Production

```bash
cd frontend
npm run build
npm run serve
```

The production server serves `dist/splatit/browser` and proxies `/api` to
StoreIt. Set `STOREIT_API_URL`, `FRONTEND_HOST`, and `FRONTEND_PORT` in
`frontend/.env`. `FRONTEND_HOST=0.0.0.0` allows LAN connections; the server must
be running, and the host firewall must allow inbound TCP traffic on port 2404.
For public access, restrict direct port access and put the server behind the
public HTTPS reverse proxy, as with the other suites.
After backend authentication changes, rebuild StoreIt and restart
`storeit-backend.service` so the protected routes take effect.

## Rendering

The viewer uses the official
[`@playcanvas/supersplat-viewer`](https://github.com/playcanvas/supersplat-viewer)
package and requests high-precision rendering. It chooses WebGPU when supported
and falls back to WebGL; its built-in UI includes camera modes, walk controls
when collision data is available, and color grading. Compression can reduce
transfer size and can introduce quantization, but a renderer's precision,
anti-aliasing, and post-processing can also affect perceived banding. The
viewer can load either `.sog` or `.ply` so they can be compared on the same
renderer; the original PLY may be much larger. Capability-aware AR and VR
buttons are shown when the current viewer renderer supports them. WebXR requires
a compatible headset/device, browser, and secure context (normally HTTPS); some
devices may require the viewer's WebGL fallback.

## Planned stages

- [x] Angular frontend structure, shared-suite shell styling, lavender/cream
      tokens, and SuperSplat Viewer integration
- [x] WebGPU rendering with WebGL fallback, high-precision rendering, and
      SuperSplat built-in color-grading controls
- [x] Signed optional collision sidecars for browser-side SuperSplat walk mode
- [ ] Viewer camera presets
- [x] StoreIt scene listing and signed asset URLs, origin allowlist, rate
      limiting, and deployment guidance
- [x] Shared ClockedIn sign-in, SplatIt-branded login, and authenticated scene
      listing and signed-URL issuance
- [ ] Optional AES-GCM encryption and remaining CDN/CORS deployment validation
