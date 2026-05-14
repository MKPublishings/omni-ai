// This file was moved from src/image-gen/app/ion-image-pipeline.ts
// All imports of IonImageOrchestrator must now reference the new location in dashboard app.

import { buildionWorkflow } from '../../../apps/dashboard/src/image-gen/backend/gateway/workflow-builder';
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

// ...rest of the file content will be filled in next step
