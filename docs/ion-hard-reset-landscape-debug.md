# Ion Hard-Reset Landscape Debug

## Purpose

Force a minimal, deterministic landscape rendering path to isolate portrait or architecture bias from orchestration complexity.

This mode bypasses standard prompt/style orchestration and enforces:

1. Neutral SDXL-compatible checkpoint profile.
2. No LoRAs in model config.
3. Fixed desert-positive and anti-portrait negative prompts.
4. Landscape-safe render parameters.

## Activation

Send image requests with mode set to one of:

1. hard-reset-desert
2. hard-reset-landscape
3. landscape-debug

Example request body:

```json
{
  "prompt": "photo-realistic desert",
  "mode": "hard-reset-desert"
}
```

## Forced Overrides

When mode is active, Ion enforces:

1. Checkpoint: sd_xl_turbo_1.0_fp16.safetensors
2. Positive prompt:
   photorealistic wide desert landscape, sand dunes, clear sky, no people, no buildings, high detail, 8k, natural colors
3. Negative prompt:
   people, person, face, portrait, building, house, city, architecture, text, logo, watermark
4. Sampler: dpmpp_2m_karras
5. Scheduler: karras
6. Steps: clamped to 20-30, default 24
7. CFG scale: clamped to 5-7, default 6
8. Resolution: landscape default 1024x576 unless valid landscape override supplied
9. Batch size: 1
10. LoRAs: []

## Where It Is Implemented

1. src/image-gen/app/ion-image-pipeline.ts
2. workers/ION-ai-images/src/index.ts

## VS-Style Debug Checklist

1. Mode sanity:
   Confirm request.mode is one of the hard-reset values.
2. Metadata sanity:
   Confirm response metadata model.checkpoint is sd_xl_turbo_1.0_fp16.safetensors.
3. Prompt sanity:
   Confirm metadata.prompt positive and negative match forced values.
4. Parameter sanity:
   Confirm metadata.model.sampler/scheduler and steps/cfg are within hard-reset bounds.
5. Regression pair test:
   Run normal mode then hard-reset mode with same user prompt and compare output drift.
6. Escalation:
   If hard-reset still returns face-centric output, treat the underlying checkpoint/runtime as contaminated and re-verify deployed model artifacts.
