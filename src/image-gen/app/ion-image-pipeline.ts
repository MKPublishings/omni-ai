// ion-image-pipeline.ts
// Single, clean, production‑safe export used by ion-image-v3 and route.ts

import {
  buildWorkflow as dashboardBuildWorkflow,
} from '../../../apps/dashboard/src/image-gen/backend/gateway/workflow-builder';

import { ionClient } from '../../../apps/dashboard/src/image-gen/backend/gateway/ionClient';
import { MockionClient } from '../../../apps/dashboard/src/image-gen/backend/gateway/MockionClient';

import { readImageGenEnvironment } from '../../../apps/dashboard/src/image-gen/config/env';
import { getImageGenerationError } from '../../../apps/dashboard/src/image-gen/shared/error-codes';
import { getCheckpointConfig } from '../../../apps/dashboard/src/image-gen/config/models.config';

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

import { IonImageOrchestrator } from '../../../apps/dashboard/src/image-gen/orchestration/ion-image-orchestrator';

/**
 * This is the ONLY exported function.
 * It wraps the dashboard workflow builder so the dashboard can import:
 *   import { buildionWorkflow } from 'image-gen/app/ion-image-pipeline'
 */
export function buildionWorkflow(config: {
  request: GenerationRequest;
  userId: string;
  modelGateway?: IModelGateway;
}): ionWorkflow {
  const env = readImageGenEnvironment();

  const gateway =
    config.modelGateway ??
    (env.useMockGateway ? new MockionClient() : new ionClient());

  return dashboardBuildWorkflow({
    request: config.request,
    userId: config.userId,
    gateway,
    getCheckpointConfig,
    getImageGenerationError,
    IonImageOrchestrator,
  });
}
