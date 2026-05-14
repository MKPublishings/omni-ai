// This file was moved from src/image-gen/app/ion-image-pipeline.ts
// All imports of IonImageOrchestrator must now reference the new location in dashboard app.

import { buildionWorkflow } from '../backend/gateway/workflow-builder';
import { ionClient } from '../backend/gateway/ionClient';
import { MockionClient } from '../backend/gateway/MockionClient';
import { readImageGenEnvironment } from '../config/env';
import { getImageGenerationError } from '../shared/error-codes';
import { getCheckpointConfig } from '../config/models.config';
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
} from '../shared/types';
import { IonImageOrchestrator } from '../orchestration/ion-image-orchestrator';

// ...rest of the file content will be filled in next step
