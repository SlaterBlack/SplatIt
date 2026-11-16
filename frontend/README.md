# SplatIt frontend

This is the Angular frontend for SplatIt. For setup, StoreIt proxy configuration,
build, and deployment instructions, see the [project README](../README.md).

Run `npm install`, create `frontend/.env`, and set `STOREIT_API_URL` to the
StoreIt API used by this environment. No frontend `.env.example` is currently
provided. Use `npm start` for local development; the Angular server proxies
`/api` requests through `proxy.conf.js`.

Run `npm run build` to create the production app in `dist/splatit/browser`.
To serve that build, run `npm run serve`; it requires the build to exist and
`STOREIT_API_URL` to be configured in `.env` or the process environment.
Service-worker registration is enabled only for production builds and is
delayed until the app has been stable for a short period.
