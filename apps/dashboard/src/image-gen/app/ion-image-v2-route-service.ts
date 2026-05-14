// src/image-gen/app/ion-image-v2-route-service.ts

import { buildionWorkflow } from './ion-image-pipeline';
import { ImageGenTypes } from '../shared/types';

/**
 * ionImageV2RouteService
 * Legacy V2 wrapper for image generation.
 * Provides a stable interface for older API routes.
 */
export const ionImageV2RouteService = {
  async generate(req: {
    prompt: string;
    aspectRatio?: string;
    workflow?: ImageGenTypes.WorkflowConfig;
    metadata?: Record<string, any>;
  }) {
    const workflow = buildionWorkflow({
      prompt: req.prompt,
      aspectRatio: req.aspectRatio ?? '1:1',
      ...req.workflow,
    });

    // Placeholder result — replace with real model call later
    return {
      imageUrl: '',
      workflowUsed: workflow.name,
      metadata: req.metadata ?? {},
    };
  },
};
