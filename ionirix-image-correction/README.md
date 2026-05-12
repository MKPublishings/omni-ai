# Ionirix Image Correction Suite

Founder-grade, modular correction workspace for image generation quality hardening.

## Structure

- prompts/: operational prompt conditioning packs
- pipelines/: portrait and landscape chains plus shared postfx
- controlnet/: model slots for depth, openpose, and segmentation
- nodes/: lightweight Python correction primitives
- tests/: regression checks for each correction domain

## Quick Start

1. Open this folder in VS Code.
2. Use the prompt templates from prompts/ as conditioning layers.
3. Route requests through pipelines/portrait_pipeline.json or pipelines/landscape_pipeline.json.
4. Keep post-processing aligned with pipelines/postfx_chain.json.

## Run Tests

Use pytest against this correction package:

python -m pytest ionirix-image-correction/tests -q

## Integration Notes

- Portrait chain focuses on depth separation, anatomy masks, edge fidelity, and light coherence.
- Landscape chain focuses on texture variance, atmospheric perspective, and shadow behavior.
- Keep modules lightweight and composable so new correction nodes can be inserted without changing the full chain.
