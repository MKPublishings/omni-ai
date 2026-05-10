# Ionirix Image Generator Migration Plan

## Purpose

This plan translates the requirements in `Ionirix Image Generation Architecture v1.pdf` into a repo-specific execution path for replacing Ion's current fragmented image stack with a unified Illustrious XL pipeline and a real Ion orchestration layer.

## Target Outcome

- Replace the current split image backends with one primary pipeline: Illustrious XL ecosystem, defaulting to ION Citizen-XL v-pred.
- Move generation behind a ComfyUI headless gateway instead of direct provider-specific calls.
- Promote Ion from prompt passthrough into a multi-step image orchestrator that performs intent parsing, tag expansion, style routing, prompt assembly, parameter optimization, safety checks, and workflow assembly.
- Preserve the existing `/api/image` contract while changing the internals behind it.
- Keep a fallback path during migration until validation gates pass.

## Current State In This Repo

### Live worker path

- `src/index.ts` handles the main `/api/image` orchestration path.
- The canonical live public route is `https://ionirix.com/api/image`.
- The current worker alias is `https://ion-ai.omni-ai.workers.dev/api/image`.
- The live route now emits `X-ION-Image-Route: image-gen-v2` under the deployed v2 path.
- `src/index.ts` now treats `image-gen-v2` as the only worker image route for both `/api/image` and the multimodal `/api/ION` image branch.

### Legacy Node image engine

- `ION-image-engine/core/modelRouter.js` now operates as a worker-only compatibility wrapper over the live `/api/image` route.
- `ION-image-engine/config/modelConfig.json` now exposes only the worker-backed model.
- `ION-image-engine/core/IONImageGenerator.js` assembles prompts and exports files locally, but does not implement the PDF's gateway, queue, storage, or checkpoint-aware architecture.

### Existing validation surface

- `scripts/smoke/imageWorkerContractSmoke.js` covers worker export shape and long-prompt handling.
- `scripts/smoke/orchestratorImageAttestationSmoke.js` covers the attested `/api/image` path and existing metadata expectations.
- `npm test` already includes the image smoke checks, so migration should preserve or deliberately update those contracts.

## Gap Summary

The PDF architecture and the current implementation differ in four major ways:

1. Backend fragmentation: the repo still mixes Cloudflare AI, OpenAI Images, and Stability API instead of one model family.
2. Missing gateway abstraction: there is no ComfyUI client, workflow builder, checkpoint manager, or LoRA manager.
3. Thin orchestration: Ion currently expands prompt text heuristically but does not execute the PDF's 12-step reasoning chain.
4. Missing asynchronous pipeline layers: queueing, storage, post-processing, metadata persistence, and structured telemetry are partial or absent.

## Migration Strategy

Use a staged cutover. Do not replace the live worker entrypoint in one large patch. Build the new image stack behind typed abstractions, run it in parallel, then switch `/api/image` once validation gates are green.

## Phase Plan

### Phase 0: Environment and seam setup

Goal: establish the new implementation surface without breaking the current path.

Tasks:

- Create `src/image-gen/` as the new subsystem root.
- Add shared contracts for request, response, checkpoints, style presets, queue jobs, and errors.
- Add config modules for ComfyUI connection, model registry, queue settings, and safety rules.
- Add environment flags for `COMFYUI_HOST`, `COMFYUI_WS`, `COMFYUI_MOCK`, `DEFAULT_CHECKPOINT`, `DEFAULT_PREDICTION_TYPE`, `DEFAULT_CFG_RESCALE`, and storage paths.
- Introduce a gateway interface so the worker can switch between mock and real backends without changing the route contract.

Repo touchpoints:

- New: `src/image-gen/shared/*`
- New: `src/image-gen/config/*`
- Existing integration point: `src/index.ts`

Validation gate:

- Types and schemas compile cleanly.
- Existing image smoke tests still pass unchanged.

### Phase 1: Model gateway and mock backend

Goal: make ComfyUI integration a swappable module before changing orchestration behavior.

Tasks:

- Implement `comfyui-client.ts` for `/prompt`, `/history/{id}`, `/view`, `/queue`, and `/ws`.
- Implement `workflow-builder.ts` that can build a minimal ION Citizen workflow with explicit `v_prediction`, `rescale_betas_zero_snr`, VAE decode, and image save nodes.
- Implement `checkpoint-manager.ts` and `lora-manager.ts` against configured model directories.
- Implement `health.ts` to report reachability, loaded checkpoint, and queue depth.
- Implement `MockComfyUIClient` for local development and CI when GPU inference is unavailable.

Repo touchpoints:

- New: `src/image-gen/backend/gateway/*`
- Existing contract tests to extend: `scripts/smoke/imageWorkerContractSmoke.js`

Validation gate:

- Mock gateway supports deterministic smoke tests.
- Real gateway can submit and observe a minimal workflow when ComfyUI is available.

### Phase 2: Ion orchestration rewrite

Goal: replace heuristic prompt shaping with the PDF's checkpoint-aware orchestration pipeline.

Tasks:

- Implement:
  - `intent-parser.ts`
  - `style-router.ts`
  - `tag-expander.ts`
  - `prompt-assembler.ts`
  - `parameter-optimizer.ts`
  - `safety-filter.ts`
  - `ion-image-orchestrator.ts`
- Encode the 7 style families from the PDF as data in `style-presets.ts`.
- Add checkpoint-aware quality tag mapping:
  - ION Citizen / Illustrious: `masterpiece, best quality, absurdres`
  - AnimagineXL: `masterpiece, high score, great score, absurdres`
  - Pony: `score_9, score_8_up, score_7_up` plus `source_anime`
- Add the shared base negative prompt and style-specific negative additions.
- Enforce SDXL bucketed dimensions from the PDF instead of the current 4k-upscale-first defaults.

Repo touchpoints:

- New: `src/image-gen/orchestration/*`
- Existing logic to retire or bridge from:
  - `ION-image-engine/core/promptOrchestrator.js`
  - `ION-image-engine/core/multiPassRefiner.js`
  - in-worker prompt shaping inside `src/index.ts`

Validation gate:

- Natural-language prompts produce structured `GenerationRequest` objects.
- Prompt assembly is deterministic in tests across all style families.
- Long prompts clamp safely without losing required quality tags and negatives.

### Phase 3: Queue, storage, and response contracts

Goal: align the runtime path with the PDF's asynchronous execution model while preserving the public API.

Tasks:

- Implement queue modules using BullMQ or an equivalent abstraction, with a mock/in-memory mode for local development.
- Implement image and metadata storage abstractions.
- Implement response mapping from internal job output to the current `/api/image` payload.
- Preserve current fields that existing clients and smoke tests expect, and add new metadata in a backward-compatible way.

Repo touchpoints:

- New: `src/image-gen/queue/*`
- New: `src/image-gen/storage/*`
- Existing response surface: `src/index.ts`

Validation gate:

- Queue state transitions are test-covered.
- Attestation smoke test still passes against `/api/image`.
- Response metadata includes checkpoint, sampler, steps, seed, style family, and prompt lineage.

### Phase 4: Post-processing and telemetry

Goal: move output handling toward the PDF's image pipeline instead of raw provider bytes only.

Tasks:

- Add format conversion, metadata embedding, thumbnail generation, and optional upscale hooks.
- Add structured generation logs and metrics collection.
- Capture prompt analytics and error-code frequency.

Repo touchpoints:

- New: `src/image-gen/post-processing/*`
- New: `src/image-gen/logging/*`
- Existing place to integrate exports: current worker response assembly and any storage/export utilities

Validation gate:

- Generated outputs carry metadata.
- Thumbnails are produced consistently.
- Error paths emit stable error codes instead of provider-specific text only.

### Phase 5: Worker cutover

Goal: flip the main `/api/image` route from the current provider-specific flow to the new subsystem.

Tasks:

- Replace direct `env.AI.run(...)` image generation in `src/index.ts` with a call into `src/image-gen` orchestrator and gateway.
- Keep current legal attestation and safety profile behavior intact.
- Retain a feature flag to fall back to the old path during the first deployment window.

Repo touchpoints:

- Existing primary cutover point: `src/index.ts`

Validation gate:

- `scripts/smoke/imageWorkerContractSmoke.js` passes.
- `scripts/smoke/orchestratorImageAttestationSmoke.js` passes.
- Side-by-side evaluation across representative prompts matches or exceeds the current output bar.

### Phase 6: Legacy engine retirement

Goal: remove duplicate generation logic once the worker path is stable.

Status: implemented for the legacy provider retirement slice. `ION-image-engine` now operates as a worker-backed compatibility wrapper, and the stale OpenAI/Stability model path has been removed from active config and router code.

Tasks:

- Completed: deprecated the OpenAI/Stability model path in `ION-image-engine`.
- Completed: adapted `ION-image-engine` to operate as a compatibility wrapper over the worker-backed `/api/image` route.
- Completed: removed stale config entries that implied OpenAI/Stability were still intended primary routes.
- Completed: removed unreachable OpenAI/Stability transport helpers from the legacy router and added smoke coverage that asserts retired model names fail fast.

Repo touchpoints:

- `ION-image-engine/core/modelRouter.js`
- `ION-image-engine/config/modelConfig.json`
- `ION-image-engine/index.js`
- `ION-image-engine/utils/smokeTest.js`
- `ION-image-engine/utils/validator.js`

Validation gate:

- Passed: no remaining worker runtime path uses direct legacy sync generation or exposes `legacy-sync` response headers.
- Passed: `npm run smoke:image`, `npm run validate:engine`, and the full `Build ION Image Engine` task succeed with the worker-only compatibility path.

## Post-PDF Continuation

The PDF-defined migration phases stop at Phase 6. The phases below are repo-specific continuation work derived from the remaining production gaps in the current implementation surface.

### Phase 7: Durable runtime adapters

Goal: replace the current in-memory queue and storage adapters with production-backed persistence so image jobs survive worker restarts and can be inspected across instances.

Tasks:

- Replace `InMemoryImageJobQueue` with a durable queue adapter backed by BullMQ, Durable Objects, or an equivalent persisted worker-safe abstraction.
- Replace `InMemoryImageArtifactStorage` metadata and artifact bookkeeping with durable backing stores such as R2 plus D1.
- Make `/api/image?queue=v1&jobId=...` read through persisted state instead of process-local singleton memory.
- Add adapter selection through env/config so local mock mode remains fast while deployed mode becomes durable.

Repo touchpoints:

- `src/image-gen/app/ion-image-queue-runtime.ts`
- `src/image-gen/queue/InMemoryImageJobQueue.ts`
- `src/image-gen/storage/InMemoryImageArtifactStorage.ts`
- `src/image-gen/shared/types.ts`
- `src/index.ts`

Validation gate:

- Queue status survives runtime reset or singleton reset in tests.
- Job metadata and artifact records remain queryable across separate runtime instances.
- Image queue contract tests pass against both mock and durable adapters.

### Phase 8: Production ComfyUI integration hardening

Goal: move the gateway from minimal happy-path polling to a production-ready ComfyUI integration with richer health, progress, and model verification.

Tasks:

- Extend `ComfyUIClient` to surface loaded checkpoint identity, queue depth, and explicit failure reasons instead of returning `unknown` or generic timeouts only.
- Add WebSocket-based progress handling or a more detailed history parser so progress events are more granular than the current step `0/1` polling flow.
- Add workflow and checkpoint verification hooks so the deployed gateway proves the requested checkpoint and workflow variant actually ran.
- Introduce health/readiness probes for ComfyUI connectivity that can be surfaced through an operator route or deployment readiness check.

Repo touchpoints:

- `src/image-gen/backend/gateway/ComfyUIClient.ts`
- `src/image-gen/backend/gateway/workflow-builder.ts`
- `src/image-gen/config/comfyui.config.ts`
- `src/image-gen/app/ion-image-pipeline.ts`
- `src/image-gen/shared/error-codes.ts`

Validation gate:

- Real ComfyUI runs emit non-placeholder checkpoint and queue status metadata.
- Provider-unavailable and timeout paths map to stable error codes with reproducible tests.
- Gateway health can distinguish reachable-but-idle, queued, and failed states.

### Phase 9: Evaluation and regression harness

Goal: turn the new pipeline into a measurable system with quality, latency, and policy regressions tracked from a fixed prompt corpus.

Tasks:

- Add a curated prompt corpus covering style families, attestation states, long prompts, safety cases, and known false-positive regressions.
- Record expected metadata outputs such as style family, checkpoint, negative prompt shape, and prompt lineage for each scenario.
- Add side-by-side evaluation hooks for mock versus real ComfyUI outputs and for future checkpoint swaps.
- Summarize telemetry into regression-friendly artifacts so image changes can be reviewed before rollout.

Repo touchpoints:

- `scripts/smoke/orchestratorImageAttestationSmoke.js`
- `scripts/smoke/imageWorkerContractSmoke.js`
- `src/image-gen/logging/ion-image-telemetry.ts`
- `src/runtime/tests/imageRouteV2.test.ts`
- `src/runtime/tests/imageQueueContract.test.ts`

Validation gate:

- Prompt corpus runs produce stable metadata assertions in CI.
- Known regression prompts stay green across route, queue, and attestation surfaces.
- Release readiness can report image-pipeline regressions as a distinct failure class.

### Phase 10: Consumer adoption and operator tooling

Goal: expose the asynchronous image pipeline cleanly to dashboard, chat, and operator surfaces so the system can be operated as a first-class product path instead of a hidden backend swap.

Tasks:

- Surface queue and progress metadata to authenticated consumers that need image job inspection or delayed download flows.
- Expose prompt lineage, checkpoint, and artifact metadata in operator-facing views or export tooling.
- Add runbooks or status endpoints for gateway health, queue backlogs, and recent image failures.
- Align frontend consumers with the v2 metadata contract so worker responses no longer need legacy compatibility assumptions.

Repo touchpoints:

- `src/index.ts`
- `src/worker.ts`
- frontend/dashboard consumers that call `/api/image`
- smoke and runtime tests that cover chat image intent and image route behavior

Validation gate:

- Consumers can poll and render queue-backed image jobs without assuming immediate synchronous completion.
- Operator surfaces can inspect recent image failures with checkpoint and request lineage context.
- No remaining frontend path depends on deprecated legacy image response assumptions.

## First Implementation Slice

The smallest safe first slice is:

1. Add `src/image-gen/shared/types.ts`.
2. Add `src/image-gen/shared/schemas.ts`.
3. Add `src/image-gen/shared/error-codes.ts`.
4. Add `src/image-gen/shared/style-presets.ts`.
5. Add `src/image-gen/config/env.ts`, `comfyui.config.ts`, and `models.config.ts`.
6. Add `src/image-gen/backend/gateway/MockComfyUIClient.ts`.
7. Add unit or smoke coverage for the mock gateway and request schemas.

This creates a stable foundation without touching live generation behavior.

## Required Dependency Changes

The PDF assumes dependencies not currently present in the root package:

- `zod` for runtime schemas
- `bullmq` for queueing
- `sharp` for format conversion and thumbnails
- `ws` if native WebSocket client support is needed in the Node-side integration surface

Potentially optional, depending on implementation choices:

- Redis local/dev setup
- SQLite driver or D1 adapter for metadata persistence

## Risk Controls

- Keep `COMFYUI_MOCK=true` support from day one to avoid blocking development on GPU availability.
- Preserve the existing `/api/image` response envelope until frontend consumers are updated.
- Keep attestation and prompt policy checks ahead of the new generation subsystem, not inside ComfyUI-specific code.
- Do not hard cut from Flux/SD/OpenAI/Stability to ComfyUI until side-by-side prompt evaluation is complete.
- Pin ComfyUI and checkpoint config in code so v-pred requirements are not left to ad hoc runtime setup.

## Validation Matrix

Minimum validation before cutover:

- Schema validation for request and response types.
- Unit tests for style routing, checkpoint-aware quality tag injection, negative prompt assembly, and parameter optimization.
- Smoke test for mock gateway workflow submission.
- Existing `imageWorkerContractSmoke` still green.
- Existing `orchestratorImageAttestationSmoke` still green.
- Manual or scripted comparison run over a fixed prompt set across all 7 style families.

## Recommended Next Actions

1. Build the shared contracts and config modules under `src/image-gen/`.
2. Add the mock gateway and a minimal ComfyUI workflow builder.
3. Introduce the new orchestrator behind a feature flag in `src/index.ts` without cutting over the route.
4. Extend smoke coverage for checkpoint-aware prompt assembly before touching the live model path.