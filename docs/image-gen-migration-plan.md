# Ionirix Image Generator Migration Plan

## Purpose

This plan translates the requirements in `Ionirix Image Generation Architecture v1.pdf` into a repo-specific execution path for replacing Ion's current fragmented image stack with a unified Illustrious XL pipeline and a real Ion orchestration layer.

## Target Outcome

- Replace the current split image backends with one primary pipeline: Illustrious XL ecosystem, defaulting to NoobAI-XL v-pred.
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

- `ION-image-engine/core/modelRouter.js` now defaults through the live worker-backed route and only retains OpenAI/Stability as fallback providers.
- `ION-image-engine/config/modelConfig.json` now defines the worker-backed model as the default chain.
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
- Implement `workflow-builder.ts` that can build a minimal NoobAI workflow with explicit `v_prediction`, `rescale_betas_zero_snr`, VAE decode, and image save nodes.
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
  - NoobAI / Illustrious: `masterpiece, best quality, absurdres`
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

Tasks:

- Deprecate the OpenAI/Stability model path in `ION-image-engine`.
- Either delete or adapt `ION-image-engine` to become a compatibility wrapper over `src/image-gen`.
- Remove stale config entries that imply OpenAI/Stability are still the intended primary route.

Repo touchpoints:

- `ION-image-engine/core/modelRouter.js`
- `ION-image-engine/config/modelConfig.json`
- `ION-image-engine/index.js`

Validation gate:

- No remaining worker runtime path uses direct legacy sync generation or exposes `legacy-sync` response headers.

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