// apps/dashboard/src/lib/generate-ion-image-v3-route-result.ts

import { ionImageV3 } from '../../../../image-gen/v3/ion-image-v3';

export async function generateIonImageV3RouteResult({
  userId,
  prompt,
  stylePack,
  aspectRatio,
  metadata,
}: {
  userId: string;
  prompt: string;
  stylePack?: string;
  aspectRatio?: string;
  metadata?: Record<string, any>;
}) {
  const result = await ionImageV3({
    prompt,
    aspectRatio,
    metadata: {
      userId,
      stylePack,
      ...metadata,
    },
  });

  return {
    imageUrl: result.imageUrl,
    workflowUsed: result.workflowUsed,
    metadata: result.metadata,
  };
}
