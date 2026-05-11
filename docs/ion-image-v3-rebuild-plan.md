# ION Image Generation Rebuild Plan (V3)

## Vision
Restore ION image generation as a production-grade, resilient system with:
- Consistent API behavior across dashboard relay, primary worker, and dedicated image worker.
- Provider resilience with ION-native rendering as the default execution path.
- Strong safety-governed orchestration (safe.tensor bootstrapped before routing).
- Real-time progress and observability (event stream + telemetry + health probes).
- Clear rollout controls and rollback-safe feature flags.

## Strategic Decision
- ComfyUI is no longer part of the default image runtime.
- ION-native renderer is now the primary provider to keep generation fully in ION control.
- Cloudflare AI remains optional fallback only when explicitly configured.

## What We Learned From ComfyUI Attempts
1. Endpoint drift caused outages:
- Traffic and direct probes often hit different workers/routes.
- Fix: enforce one canonical routing contract and health identity headers.

2. Tunnel and path instability caused false negative health:
- /queue and /prompt had 1033/530 or 403 failures depending on host.
- Fix: route health by weighted checks and degrade gracefully.

3. Missing fallback parity created hard failures:
- One worker path had fallback behavior while another hard-failed.
- Fix: central provider strategy shared by all entrypoints.

4. Polling timeout was too short for realistic GPU execution:
- Fix already validated: longer polling + history fallback + WebSocket option.

5. safe.tensor must be bootstrapped before governed routing:
- Missing bootstrap leads to blocked requests and safety errors.
- Fix: bootstrap before each image-route execution path.

## Target Architecture

### 1) API Surfaces (Unified Contract)
- POST /api/image
- GET /api/image/runtime-config
- Optional queue endpoints for long-running generation and progressive updates

All surfaces should emit:
- X-ION-Image-Route (image-gen-v3)
- X-ION-Image-Provider (comfyui | cloudflare-ai)
- X-ION-Request-Id

### 2) V3 Orchestrator Layer
- Input normalization: prompt, dimensions, style profile, parameters.
- Safety + policy pipeline: safe.tensor + content policy gates.
- Provider strategy execution: primary provider then governed fallback.
- Compatibility response builder: preserve existing payload shape during migration.

### 3) Provider Layer
- ION-native provider:
  - Own deterministic, ultra-fast rendering engine for immediate output.
  - Uses ION orchestration, style routing, safety, and metadata pipeline.
- Cloudflare AI provider (optional fallback):
  - Direct AI.run image generation fallback for rare degraded-runtime states.
  - Prompt quality preservation and model guardrails.
- ComfyUI provider:
  - Kept only as optional compatibility path during migration windows.

### 4) Data and Queue Layer
- In-memory mode for local/dev.
- KV-backed queue and artifact metadata for production.
- Deterministic job lifecycle states: queued, processing, completed, failed.

### 5) Dashboard UX Layer
- Keep existing assistant /image path contract.
- Add explicit route/provider status in developer diagnostics UI.
- Add retry intent and provider-fallback reason in message metadata.

### 6) Observability and Guardrails
- Structured logs for request route, provider, promptId, latency, failure type.
- Route health monitor for:
  - gateway reachability
  - queue availability
  - prompt submit status
- Golden smoke tests for image relay + worker contract + attestation headers.

## Rollout Plan

### Phase 1 (Now): V3 Foundation Behind Flags
- Add v3 runtime config parser.
- Add provider strategy service with ION-native primary and fallback controls.
- Integrate v3 in dedicated image worker and dashboard direct relay behind toggles.

### Phase 2: Worker Parity and Health Hardening
- Use shared v3 service in all worker entrypoints serving /api/image.
- Normalize error mapping and headers.
- Add provider diagnostics endpoint.

### Phase 3: Queue + Streaming UX
- Enable queue-first mode for long jobs with progress updates.
- Surface progress to dashboard assistant UI.

### Phase 4: Stability and Cost Controls
- Add request classification for model/steps/guidance bounds.
- Add adaptive fallback thresholds and usage guardrails.

## Environment Flags (V3)
- ION_IMAGE_PIPELINE_V3=true|false
- ION_IMAGE_PROVIDER_PRIMARY=ion-native|comfyui|cloudflare-ai
- ION_IMAGE_PROVIDER_FALLBACK=ion-native|comfyui|cloudflare-ai|none
- ION_IMAGE_FALLBACK_ON_COMFYUI_DOWN=true|false
- ION_IMAGE_FALLBACK_ON_TIMEOUT=true|false
- ION_IMAGE_FALLBACK_MODEL=@cf/stabilityai/stable-diffusion-xl-base-1.0
- DASHBOARD_IMAGE_PIPELINE_V3=true|false (dashboard relay override)

## Current Implementation Status
- Implemented in codebase:
  - src/image-gen/v3/runtime-config.ts
  - src/image-gen/v3/image-generation-service.ts
  - src/image-gen/v3/ion-native-renderer.ts
  - src/image-gen/v3/index.ts
  - src/index.ts /api/image now routes through v3 by default unless explicitly disabled
  - workers/ION-ai-images/src/index.ts wired to v3 when ION_IMAGE_PIPELINE_V3 enabled
  - apps/dashboard/src/app/api/image/route.ts wired to v3 when direct relay + v3 enabled
  - apps/dashboard/src/tests/image-api-route.test.ts updated for v3 relay assertions

- Validation:
  - Dashboard route tests pass.
  - Full repo typecheck currently fails due existing legacy typing issues in src/index.ts unrelated to this v3 wiring.

## Success Criteria
- No hard-fail on ComfyUI prompt-path outages when fallback policy allows fallback.
- Same response shape and metadata contract across dashboard relay and workers.
- Provider and route identity visible through response headers and logs.
- Smoke suite catches relay drift before deploy.
