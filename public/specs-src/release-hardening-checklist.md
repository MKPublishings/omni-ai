# ION Ai Release Hardening Checklist

## 1) Wrangler Bindings
- Ensure `AI`, `ASSETS`, `MIND`, and `MEMORY` bindings are configured.
- Enable `ION_DB` (D1) and `ION_SESSION` (Durable Object) for full state behavior.
- Configure cron trigger for scheduled maintenance.

## 2) Required Production Vars
- `ION_ENV=production`
- `ION_ADMIN_KEY=<strong secret (16+ chars)>`
- `ION_AUTONOMY_LEVEL=balanced` (or `conservative` / `aggressive`)
- If MP4 encoding is desired in server runtime:
  - `ION_VIDEO_ENABLE_MP4_ENCODING=true` (also supports `1`, `yes`, `on`)
  - Ensure `ffmpeg` is installed and available on `PATH`
- Optionally tune:
  - `ION_MEMORY_RETENTION_DAYS`
  - `ION_SESSION_MAX_AGE_HOURS`
  - response/token caps

## 3) Security Validation
- Confirm maintenance endpoints require `x-ION-admin-key` in production:
  - `GET /api/maintenance/status`
  - `POST /api/maintenance/run`
- Verify unauthorized requests return `401`.

## 4) Release Readiness (Background)
- Call `GET /api/release/spec` and inspect `runtime.readiness`.
- Proceed only when `runtime.readiness.ready: true` and `failedChecks` is empty.

## 5) Functional Smoke
- Chat route (`/api/ION`) works with streaming.
- Image generation works (`/api/image` and multimodal `/api/ION` route=image).
- Maintenance run updates status telemetry and autonomy fields.

## 6) Post-Deploy Observe
- Check logs for `release_readiness_background` and resolve any failed checks.
- Confirm `/api/maintenance/status` shows healthy drift/autonomy metrics over time.
