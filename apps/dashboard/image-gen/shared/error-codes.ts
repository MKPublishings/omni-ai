import type { ImageGenerationError } from './types';

export const IMAGE_GENERATION_ERROR_CODES = {
  E_QUEUE_FULL: {
    code: 'E_QUEUE_FULL',
    message: 'Job queue is at capacity.',
    retriable: true,
    suggestedAction: 'retry_later',
  },
  E_MODEL_LOAD: {
    code: 'E_MODEL_LOAD',
    message: 'Checkpoint failed to load.',
    retriable: false,
    suggestedAction: 'switch_checkpoint',
  },
  E_VRAM_OOM: {
    code: 'E_VRAM_OOM',
    message: 'Out of GPU memory during inference.',
    retriable: true,
    suggestedAction: 'reduce_resolution',
  },
  E_TIMEOUT: {
    code: 'E_TIMEOUT',
    message: 'Generation exceeded timeout.',
    retriable: true,
    suggestedAction: 'reduce_steps',
  },
  E_SAFETY_BLOCK: {
    code: 'E_SAFETY_BLOCK',
    message: 'Prompt requires safety-context adjustment before generation.',
    retriable: false,
    suggestedAction: 'modify_prompt',
  },
  E_INVALID_PARAMS: {
    code: 'E_INVALID_PARAMS',
    message: 'Generation parameters are invalid.',
    retriable: false,
    suggestedAction: 'fix_parameters',
  },
  E_LORA_NOT_FOUND: {
    code: 'E_LORA_NOT_FOUND',
    message: 'Requested LoRA is not available.',
    retriable: false,
    suggestedAction: 'remove_lora',
  },
  E_POST_PROCESS: {
    code: 'E_POST_PROCESS',
    message: 'Post-processing failed.',
    retriable: true,
    suggestedAction: 'retry_post_processing',
  },
  E_ion_DOWN: {
    code: 'E_ion_DOWN',
    message: 'ion is unavailable.',
    retriable: true,
    suggestedAction: 'check_gateway',
  },
} as const satisfies Record<string, ImageGenerationError>;

export type ImageGenerationErrorCode = keyof typeof IMAGE_GENERATION_ERROR_CODES;

export function getImageGenerationError(code: ImageGenerationErrorCode): ImageGenerationError {
  return IMAGE_GENERATION_ERROR_CODES[code];
}