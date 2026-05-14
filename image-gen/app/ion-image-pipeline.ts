// ion-image-pipeline.ts
// Central pipeline entrypoint for Ion image generation (V2 + V3 compatible)

import {
  IonImageOrchestrator,
} from '../orchestration/ion-image-orchestrator';

import {
  ionClient,
} from '../backend/gateway/ionClient';

import {
  MockionClient,
} from '../backend/gateway/MockionClient';

import {
  readImageGenEnvironment,
} from '../config/env';

import {
  getImageGenerationError,
} from '../shared/error-codes';

import {
  getCheckpointConfig,
} from '../config/models.config';

import type {
  ionWorkflow,
  GenerationRequest,
  ImageCompositionPreset,
  ImageVariationMode,
  ImageSampler,
  ImageScheduler,
  IModelGateway,
  ImageJobStatus,
  IonImagePipelineResult,
  KimonoStyleProfileId,
  StyleFamilyId,
} from '../../../apps/dashboard/src/image-gen/shared/types';


// ------------------------------------------------------------
//  SINGLE SOURCE OF TRUTH: buildionWorkflow()
// ------------------------------------------------------------

/**
 * Build a workflow configuration for Ion image generation.
 * This is the ONLY exported function from this file.
 */
export function buildionWorkflow(config: {
  request: GenerationRequest;
  userId?: string;
  useMock?: boolean;
}): ionWorkflow {
  const env = readImageGenEnvironment();
  const gateway: IModelGateway = config.useMock
    ? new MockionClient()
    : new ionClient();

  const checkpoint = getCheckpointConfig(config.request.model);

  return {
    env,
    gateway,
    checkpoint,
    request: config.request,
    userId: config.userId,
  };
}


// ------------------------------------------------------------
//  Pipeline executor
// ------------------------------------------------------------

/**
 * Execute the workflow using the orchestrator.
 */
export async function runIonImagePipeline(
  workflow: ionWorkflow
): Promise<IonImagePipelineResult> {
  try {
    const orchestrator = new IonImageOrchestrator(workflow);
    return await orchestrator.execute();
  } catch (err: any) {
    return getImageGenerationError(err);
  }
}


// ------------------------------------------------------------
//  Re-exports for convenience (optional)
// ------------------------------------------------------------

export type {
  GenerationRequest,
  ImageCompositionPreset,
  ImageVariationMode,
  ImageSampler,
  ImageScheduler,
  ImageJobStatus,
  IonImagePipelineResult,
  KimonoStyleProfileId,
  StyleFamilyId,
};
