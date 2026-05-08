# Generated Next.js Output

This directory contains generated Next.js build artifacts committed for deployment/runtime reasons.

These files are not authoritative configuration and should not be used as the source of truth for runtime URLs, worker aliases, or deployment targets.

In particular, bundled files in this directory may embed whichever public API host or worker alias was present at build time.

Default repo sweeps exclude these generated deployment roots unless build-output inspection is explicitly requested:

- `public/`
- `apps/dashboard/out/`

`public/_next/` is one generated subtree inside the excluded `public/` deployment root; it is not a special one-off exception.

Canonical sources of truth in this repo are:

- `wrangler.toml` for the primary public worker runtime and `APP_BASE_URL`
- `workers/*/wrangler.toml` for worker-to-worker routing targets
- `scripts/deploy.js` for deploy-time output shown to operators
- top-level release and migration docs for current rollout state

Default repo sweeps should exclude `public/**` and `apps/dashboard/out/**` unless you are explicitly auditing generated build output.

Use `npm run forensics:image` or `npm run forensics:image:strict` for normal config review.
Use `npm run forensics:image:build-output` only when you intentionally want generated bundle inspection included.

If a value in `public/_next` or anywhere else under `public/` or `apps/dashboard/out/` disagrees with those sources, treat the generated artifact as stale and rebuild or redeploy instead of editing the bundle directly.