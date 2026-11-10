# SplatIt

SplatIt is the AI3D architectural visualisation suite for presenting interactive
Gaussian splat scenes. It follows the Angular frontend and StoreIt backend
structure used by ClockIt and ManageIt, with a lavender-and-cream brand palette.

## Project layout

```text
frontend/   Angular application, Spark viewer, and same-origin StoreIt proxy
```

The app opens on the **Scenes** tab, where available splats are shown as cards.
Selecting one opens it in the **Viewer** tab. Scene files are listed from the
StoreIt API, which reads `\\192.168.1.11\max resources\GaussianSplats`.

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

StoreIt exposes `GET /api/splatit/scenes` for the grid, a
`GET /api/splatit/scenes/:id/access` endpoint that returns an HMAC-signed asset
URL valid for five minutes, and `GET /api/splatit/assets/:id` for the file.
Listing, signing, and asset requests require an allowed `Origin` or `Referer`.
The frontend calls these routes through its same-origin `/api` proxy.

Origin checks and short-lived URLs deter casual cross-site embedding and direct
third-party viewer use; they are not strong authentication. A visitor who can
view a scene can still inspect or capture its downloaded data, and non-browser
clients can forge origin headers. Do not treat this as DRM for confidential
assets. The current implementation does not encrypt splats. Configure the
public reverse proxy with `Content-Security-Policy: frame-ancestors 'self'` (or
an explicit trusted parent allowlist) to prevent other sites from framing the
SplatIt page. Mount availability, file permissions, DNS, and production origins
must be verified on the StoreIt host; the current development machine did not
have the Bluey share mounted.

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

The viewer now obtains a short-lived URL from StoreIt for each selected scene.
The StoreIt service must be configured and the share mounted before the Scenes
grid can populate.

## Planned stages

- [x] Angular frontend structure, shared-suite shell styling, lavender/cream
      tokens, and Stage 1 lazy-loaded rendering
- [x] Orbit controls with damping, zoom limits, touch gestures, and focus picking
- [x] Fly mode with keyboard movement and adjustable scroll-wheel speed
- [x] Viewer toolbar, fullscreen, reset/frame shortcuts, and expandable controls legend
- [ ] Viewer camera presets
- [x] StoreIt scene listing and signed asset URLs, origin allowlist, rate
      limiting, and deployment guidance
- [ ] Optional AES-GCM encryption and remaining CDN/CORS deployment validation
