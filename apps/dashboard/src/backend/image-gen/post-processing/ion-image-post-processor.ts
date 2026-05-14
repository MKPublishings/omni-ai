import type {
  GenerationRequest,
  IonImagePostProcessingSummary,
  IonImagePromptAnalytics,
} from '../shared/types';

function tokenize(value: string): string[] {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function jaccardSimilarity(left: string, right: string): number {
  const a = new Set(tokenize(left));
  const b = new Set(tokenize(right));
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) {
      overlap += 1;
    }
  }

  return Number((overlap / (a.size + b.size - overlap)).toFixed(3));
}

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
  const semanticAlignmentScore = jaccardSimilarity(
    request.ionMetadata.originalUserPrompt,
    request.prompt.positive,
  );

  return {
    originalPromptLength: request.ionMetadata.originalUserPrompt.length,
    positivePromptLength: request.prompt.positive.length,
    negativePromptLength: request.prompt.negative.length,
    qualityTagCount: request.prompt.qualityTags.length,
    styleTagCount: request.prompt.styleTags.length,
    subjectDomain: request.ionMetadata.subjectDomain,
    subjectAnchorCount: (request.ionMetadata.subjectPriorityAnchors || []).length,
    semanticAlignmentScore,
    clipSimilarityEstimate: semanticAlignmentScore,
    clipSimilaritySource: 'heuristic',
  };
}