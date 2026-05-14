// src/image-gen/app/ion-image-pipeline.ts

import { ImageGenTypes } from '../shared/types'
import { getCheckpointConfig } from '../config/models.config'
import { getImageGenerationError } from '../shared/error-codes'
import { readImageGenEnvironment } from '../config/env'
import { IonImageOrchestrator } from '../orchestration/ion-image-orchestrator'
import { ionClient, mockIonClient } from '../backend/gateway/clients'

/**
 * Build a workflow configuration for the Ion Image Pipeline.
 * This is the ONLY exported function from this file.
 */
export function buildIonWorkflow(config: {
  prompt: string
  negativePrompt?: string
  width: number
  height: number
  steps: number
  sampler: ImageGenTypes.ImageSampler
  scheduler: ImageGenTypes.ImageScheduler
  model: string
  seed?: number
  userId?: string
  stylePack?: string
}) {
  const env = readImageGenEnvironment()
  const client = env.useMockClient ? mockIonClient() : ionClient()

  const checkpoint = getCheckpointConfig(config.model)
  if (!checkpoint) {
    throw getImageGenerationError('UNKNOWN_MODEL')
  }

  const orchestrator = new IonImageOrchestrator({
    client,
    checkpoint,
    width: config.width,
    height: config.height,
    steps: config.steps,
    sampler: config.sampler,
    scheduler: config.scheduler,
    seed: config.seed ?? Math.floor(Math.random() * 999999999),
    stylePack: config.stylePack,
    userId: config.userId,
  })

  return orchestrator.build({
    prompt: config.prompt,
    negativePrompt: config.negativePrompt ?? '',
  })
}
