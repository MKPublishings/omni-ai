// src/image-gen/backend/templates/universal-base-graph.ts
// Universal Base Graph Template for ComfyUI
// This is the atomic, always-valid ComfyUI graph that Ion expands for any job

import type { ComfyUIWorkflow } from '../../shared/types';

export interface UniversalBaseGraphOptions {
  checkpointName: string;
  positivePrompt: string;
  negativePrompt: string;
  width?: number;
  height?: number;
  batchSize?: number;
  seed?: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  scheduler?: string;
  denoise?: number;
  filenamePrefix?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Universal Base Graph Template
 *
 * This is the minimal, atomic, always-valid ComfyUI graph:
 *
 *   [LoadCheckpoint] → [EncodePositive] ─┐
 *   [LoadCheckpoint] → [EncodeNegative]  ├→ [Sampler] → [Decode] → [Save]
 *   [LoadCheckpoint] → [EmptyLatent] ────┘
 *
 * Everything else gets injected by Ion depending on the job.
 */
export function buildUniversalBaseGraph(options: UniversalBaseGraphOptions): ComfyUIWorkflow {
  const {
    checkpointName,
    positivePrompt,
    negativePrompt,
    width = 512,
    height = 512,
    batchSize = 1,
    seed = 0,
    steps = 20,
    cfgScale = 7.0,
    sampler = "euler",
    scheduler = "normal",
    denoise = 1.0,
    filenamePrefix = "ion-output",
    metadata = {},
  } = options;

  const workflow: ComfyUIWorkflow = {
    // ---------------------------------------------------------
    // LAYER 1: MODEL LOADING
    // ---------------------------------------------------------
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: checkpointName,
      },
    },

    // ---------------------------------------------------------
    // LAYER 2: PROMPT ENCODING
    // ---------------------------------------------------------
    "2": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: positivePrompt,
        clip: ["1", 1],
      },
    },

    "3": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: negativePrompt,
        clip: ["1", 1],
      },
    },

    // ---------------------------------------------------------
    // LAYER 3: LATENT PREPARATION
    // ---------------------------------------------------------
    "4": {
      class_type: "EmptyLatentImage",
      inputs: {
        width,
        height,
        batch_size: batchSize,
      },
    },

    // ---------------------------------------------------------
    // LAYER 4: SAMPLING (GENERATION)
    // ---------------------------------------------------------
    "5": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps,
        cfg: cfgScale,
        sampler_name: sampler,
        scheduler,
        denoise,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
      },
    },

    // ---------------------------------------------------------
    // LAYER 5: DECODING
    // ---------------------------------------------------------
    "6": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["5", 0],
        vae: ["1", 2],
      },
    },

    // ---------------------------------------------------------
    // LAYER 6: OUTPUT
    // ---------------------------------------------------------
    "7": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: filenamePrefix,
        images: ["6", 0],
      },
    },

    // ---------------------------------------------------------
    // METADATA (non-execution, but useful for tracking)
    // ---------------------------------------------------------
    metadata: {
      template: "universal-base-graph",
      checkpoint: checkpointName,
      positive_prompt: positivePrompt,
      negative_prompt: negativePrompt,
      width,
      height,
      seed,
      steps,
      cfg_scale: cfgScale,
      sampler,
      scheduler,
      ...metadata,
    },
  };

  return workflow;
}

/**
 * Node ID constants for graph expansion
 * Use these when injecting nodes into the base graph
 */
export const NODE_IDS = {
  // Input layer
  CHECKPOINT: "1",

  // Encoding layer
  POSITIVE_ENCODE: "2",
  NEGATIVE_ENCODE: "3",

  // Latent layer
  EMPTY_LATENT: "4",

  // Sampling layer
  SAMPLER: "5",

  // Output layer
  VAE_DECODE: "6",
  SAVE_IMAGE: "7",

  // Expansion zones (for injected nodes)
  CONTROLNET_ZONE_START: 100,
  LORA_ZONE_START: 200,
  UPSCALE_ZONE_START: 300,
  INPAINT_ZONE_START: 400,
} as const;

/**
 * Graph Expansion System
 * Ion uses these utilities to inject additional nodes
 */

export function injectControlNet(
  graph: ComfyUIWorkflow,
  controlNetName: string,
  controlImage: string,
  strength: number = 1.0,
): ComfyUIWorkflow {
  const nodeId = String(NODE_IDS.CONTROLNET_ZONE_START + Object.keys(graph).length);

  return {
    ...graph,
    [nodeId]: {
      class_type: "ControlNetLoader",
      inputs: {
        control_net_name: controlNetName,
      },
    },
  };
}

export function injectLoRA(
  graph: ComfyUIWorkflow,
  loraName: string,
  strength: number = 1.0,
): ComfyUIWorkflow {
  const nodeId = String(NODE_IDS.LORA_ZONE_START + Object.keys(graph).length);

  return {
    ...graph,
    [nodeId]: {
      class_type: "LoraLoader",
      inputs: {
        lora_name: loraName,
        strength_model: strength,
        strength_clip: strength,
        model: [NODE_IDS.CHECKPOINT, 0],
        clip: [NODE_IDS.CHECKPOINT, 1],
      },
    },
  };
}

export function injectUpscale(
  graph: ComfyUIWorkflow,
  upscaleModel: string,
  scale: number = 2,
): ComfyUIWorkflow {
  const nodeId = String(NODE_IDS.UPSCALE_ZONE_START + Object.keys(graph).length);

  return {
    ...graph,
    [nodeId]: {
      class_type: "UpscaleModelLoader",
      inputs: {
        upscale_model: upscaleModel,
      },
    },
  };
}
