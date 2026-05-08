import type {
  GenerationRequest,
  IonImagePostProcessingSummary,
  IonImagePromptAnalytics,
} from '../shared/types';

export function buildIonImagePostProcessingSummary(request: GenerationRequest): IonImagePostProcessingSummary {
  return {
    outputFormat: request.postProcessing.format,
    quality: request.postProcessing.quality,
    metadataEmbedded: request.postProcessing.embedMetadata,
    thumbnailGenerated: request.postProcessing.generateThumbnail,
    upscaleRequested: request.postProcessing.upscale.enabled,
  };
}

export function buildIonImagePromptAnalytics(request: GenerationRequest): IonImagePromptAnalytics {
  return {
    originalPromptLength: request.ionMetadata.originalUserPrompt.length,
    positivePromptLength: request.prompt.positive.length,
    negativePromptLength: request.prompt.negative.length,
    qualityTagCount: request.prompt.qualityTags.length,
    styleTagCount: request.prompt.styleTags.length,
  };
}