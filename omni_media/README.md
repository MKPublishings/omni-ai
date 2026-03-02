# Omni Media (Image-Only)

`omni_media` provides an Omni-native image generation service layer used for local/service integration.

## Scope
- Text/Image prompt input -> image outputs
- Sync generation and async job APIs
- Safety hooks, watermarking, and storage adapters

## Main Modules
- `pipeline.py` — request normalization, model routing, generation packaging
- `service.py` — sync + async orchestration, runtime diagnostics
- `http_fastapi.py` — HTTP API (`/v1/generate/image`, `/v1/jobs/*`, admin endpoints)
- `engine.py` — Omni backend adapter for image generation
- `model_registry.py` — image profiles and selection
- `storage.py` — local and S3-like adapters

## Environment Notes
- API key auth: `OMNI_MEDIA_API_KEYS`
- Rate limits: `OMNI_MEDIA_RATE_LIMIT_*` and window vars
- Optional Redis limiter via `OMNI_MEDIA_RATE_LIMIT_BACKEND=redis` and `OMNI_MEDIA_REDIS_URL`

## Run (example)
- Install deps in the target Python environment
- Start FastAPI app through `run_server.py` or your ASGI runner
