// apps/dashboard/src/lib/ion-image-v3.ts

import { imageGenerationService } from 'ion-image-v2-route-service';
import { buildionWorkflow } from 'image-gen/app/ion-image-pipeline';
import { ImageGenTypes } from 'image-gen/shared/types';

/**
 * IonImageV3Request
 * Defines the shape of a v3 image generation request.
 */
export interface IonImageV3Request {
  prompt: string;
  aspectRatio?: string;
  workflow?: ImageGenTypes.WorkflowConfig;
  metadata?: Record<string, any>;
}

/**
 * IonImageV3Response
 * Defines the shape of a v3 image generation response.
 */
export interface IonImageV3Response {
  imageUrl: string;
  workflowUsed: string;
  metadata?: Record<string, any>;
}

/**
 * ionImageV3
 * High‑level wrapper for the v3 image generation pipeline.
 * This is the function your API route will call.
 */
export async function ionImageV3(
  req: IonImageV3Request
): Promise<IonImageV3Response> {
  // Build workflow (Turbo, SDXL, cinematic, etc.)
  const workflow = buildionWorkflow({
    prompt: req.prompt,
    aspectRatio: req.aspectRatio ?? '1:1',
    ...req.workflow,
  });

  // Execute the v3 generation service
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
