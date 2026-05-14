// apps/dashboard/image-gen/v3/ion-image-v3.ts

import { imageGenerationService } from './image-generation-service';
import { buildionWorkflow } from '../app/ion-image-pipeline';
import { ionImageV2RouteService } from '../app/ion-image-v2-route-service';
import { ImageGenTypes } from '../shared/types';

export interface IonImageV3Request {
  prompt: string;
  aspectRatio?: string;
  workflow?: ImageGenTypes.WorkflowConfig;
  metadata?: Record<string, any>;
}

export interface IonImageV3Response {
  imageUrl: string;
  workflowUsed: string;
  metadata?: Record<string, any>;
}

export async function ionImageV3(
  req: IonImageV3Request
): Promise<IonImageV3Response> {
  const workflow = buildionWorkflow({
    prompt: req.prompt,
    aspectRatio: req.aspectRatio ?? '1:1',
    ...req.workflow,
  });

  const result = await imageGenerationService.generate({
    workflow,
    metadata: req.metadata ?? {},
  });

  return {
    imageUrl: result.imageUrl,
    workflowUsed: workflow.name,
    metadata: result.metadata,
  };
}
