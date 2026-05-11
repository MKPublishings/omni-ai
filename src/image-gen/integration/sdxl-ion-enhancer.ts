/**
 * SDXL Ion Enhancer
 * 
 * Enhances stable-diffusion-xl-base-1.0 with ION's sophisticated prompt processing,
 * quality optimization, and style handling when ComfyUI is unavailable.
 * 
 * Features:
 * - ION-style prompt assembly with quality tags
 * - Advanced anime/style detection
 * - Negative prompt optimization
 * - Parameter optimization per style family
 */

import { parseIntent } from '../orchestration/intent-parser';
import { expandTags } from '../orchestration/tag-expander';
import { getStylePreset } from '../shared/style-presets';
import { getCheckpointConfig } from '../config/models.config';
import type {
  ParsedIntent,
  TagExpansionResult,
  StyleFamilyId,
} from '../shared/types';

export interface SdxlIonEnhancerOptions {
  animeLike: boolean;
  styleFamily?: StyleFamilyId;
  checkpointId: string;
}

export interface EnhancedPromptResult {
  positive: string;
  negative: string;
  qualityTags: string[];
  styleTags: string[];
  confidence: number;
  inferredMood: string;
}

export interface SdxlParameterOptimization {
  guidance: number;
  steps: number;
  sampler?: string;
  scheduler?: string;
  cfgRescale?: number;
}

const BASE_QUALITY_TAGS = [
  'masterpiece',
  'best quality',
  'high quality',
  'highly detailed',
  'unreal engine',
  'octane render',
];

const ANIME_QUALITY_TAGS = [
  'anime',
  'cel art',
  'clean line art',
  'animation',
  'hand drawn',
  'expressive',
  'detailed background',
];

const PHOTOREALISTIC_QUALITY_TAGS = [
  'photorealistic',
  'cinematic',
  '4k',
  '8k',
  'professional lighting',
  'detailed textures',
  'sharp focus',
];

const BASE_NEGATIVE_PROMPT = [
  'low quality',
  'worst quality',
  'blurry',
  'deformed',
  'distorted',
  'disfigured',
  'bad anatomy',
  'bad proportions',
  'out of frame',
  'watermark',
  'signature',
];

const ANIME_NEGATIVE_TAGS = [
  'realistic',
  'photorealistic',
  'live action',
  '3d render',
  'photo',
  'realistic skin pores',
  'detailed skin texture',
  'monochrome',
];

const PHOTOREALISTIC_NEGATIVE_TAGS = [
  'sketch',
  'cartoon',
  'anime',
  'drawn',
  'illustration',
  'painted',
  'bad lighting',
  'underexposed',
  'overexposed',
];

/**
 * Parse user intent and prepare for enhancement
 */
function parseUserIntent(promptText: string): ParsedIntent {
  return parseIntent(promptText);
}

/**
 * Get checkpoint quality configuration
 */
function getCheckpointQualityTags(checkpointId: string): string[] {
  try {
    const config = getCheckpointConfig(checkpointId);
    const tags = [...BASE_QUALITY_TAGS, ...(config.qualityTags || [])];
    if (config.sourceTag) {
      tags.push(config.sourceTag);
    }
    return [...new Set(tags)];
  } catch {
    return BASE_QUALITY_TAGS;
  }
}

/**
 * Get style-specific quality tags
 */
function getStyleQualityTags(styleFamily: StyleFamilyId | undefined, animeLike: boolean): string[] {
  if (animeLike) {
    return ANIME_QUALITY_TAGS;
  }

  if (styleFamily) {
    try {
      const preset = getStylePreset(styleFamily as any);
      const tags = preset.positivePrefix.split(',').map(t => t.trim()).filter(Boolean);
      return [...new Set([...PHOTOREALISTIC_QUALITY_TAGS, ...tags])];
    } catch {
      return PHOTOREALISTIC_QUALITY_TAGS;
    }
  }

  return PHOTOREALISTIC_QUALITY_TAGS;
}

/**
 * Build negative prompt with style-aware tags
 */
function buildNegativePromptWithStyle(animeLike: boolean): string {
  const negative = [...BASE_NEGATIVE_PROMPT];
  
  if (animeLike) {
    negative.push(...ANIME_NEGATIVE_TAGS);
  } else {
    negative.push(...PHOTOREALISTIC_NEGATIVE_TAGS);
  }

  return negative.join(', ');
}

/**
 * Apply deduplication and ordering to negative prompt
 */
function deduplicateAndOrderNegatives(negativePrompt: string): string {
  const tokens = negativePrompt.split(',').map(t => t.trim()).filter(Boolean);
  const seen = new Set<string>();
  const ordered: string[] = [];

  // Critical negatives first
  const criticalPatterns = ['deformed', 'bad', 'low quality', 'worst'];
  for (const token of tokens) {
    const isCritical = criticalPatterns.some(p => token.toLowerCase().includes(p));
    if (isCritical && !seen.has(token.toLowerCase())) {
      ordered.push(token);
      seen.add(token.toLowerCase());
    }
  }

  // Style negatives second
  for (const token of tokens) {
    if (!seen.has(token.toLowerCase())) {
      ordered.push(token);
      seen.add(token.toLowerCase());
    }
  }

  return ordered.join(', ');
}

/**
 * Expand user prompt with inferred tags using ION's system
 */
function expandPromptWithIONTags(intent: ParsedIntent, animeLike: boolean): TagExpansionResult {
  const expanded = expandTags(intent);
  
  // Inject anime-specific tags if detected
  if (animeLike) {
    const animePatterns = ['anime_style', 'cel_shading', 'line_art'];
    const newTags = expanded.tags.filter(t => 
      !t.includes('realistic') && !t.includes('photorealistic')
    );
    // Add anime focus tags
    newTags.push(...animePatterns.filter(p => !newTags.includes(p)));
    return { ...expanded, tags: newTags };
  }

  return expanded;
}

/**
 * Build enhanced SDXL prompt using ION orchestration
 */
export function buildIonEnhancedSdxlPrompt(
  promptText: string,
  options: SdxlIonEnhancerOptions
): EnhancedPromptResult {
  // Parse user intent
  const intent = parseUserIntent(promptText);
  
  // Expand with ION tags
  const expanded = expandPromptWithIONTags(intent, options.animeLike);
  
  // Get checkpoint quality tags
  const checkpointTags = getCheckpointQualityTags(options.checkpointId);
  
  // Get style quality tags
  const styleTags = getStyleQualityTags(options.styleFamily, options.animeLike);
  
  // Assemble positive prompt
  const allQualityTags = [...new Set([...checkpointTags, ...styleTags])];
  const expandedPromptTokens = expanded.tags.join(', ');
  const positive = [
    promptText.trim(),
    expandedPromptTokens,
    allQualityTags.join(', '),
  ]
    .filter(Boolean)
    .join(', ')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .join(', ');

  // Build negative prompt
  const baseNegative = buildNegativePromptWithStyle(options.animeLike);
  const negative = deduplicateAndOrderNegatives(baseNegative);

  return {
    positive,
    negative,
    qualityTags: allQualityTags,
    styleTags,
    confidence: 0.85,
    inferredMood: expanded.inferredMood || (options.animeLike ? 'stylized' : 'realistic'),
  };
}

/**
 * Optimize SDXL parameters based on style and content
 */
export function optimizeSdxlParameters(
  styleFamily: StyleFamilyId | undefined,
  animeLike: boolean,
  baseGuidance: number = 7,
  baseSteps: number = 28
): SdxlParameterOptimization {
  let guidance = baseGuidance;
  let steps = baseSteps;
  let sampler = 'euler';
  let scheduler = 'karras';
  let cfgRescale = 0;

  if (animeLike) {
    // Anime tends to benefit from higher guidance
    guidance = Math.min(8.5, baseGuidance * 1.1);
    // More steps for better anime rendering
    steps = Math.min(32, baseSteps * 1.15);
    sampler = 'dpmpp_2m_karras';
    cfgRescale = 0.7;
  } else if (styleFamily) {
    // Photorealistic styles
    guidance = Math.max(6.5, baseGuidance * 0.95);
    steps = baseSteps;
    sampler = 'dpmpp_2m_karras';
    cfgRescale = 0;
  }

  return {
    guidance: Math.round(guidance * 10) / 10,
    steps: Math.max(1, Math.min(50, steps)),
    sampler,
    scheduler,
    cfgRescale: cfgRescale > 0 ? cfgRescale : undefined,
  };
}

/**
 * Create comprehensive SDXL enhancement metadata
 */
export interface SdxlEnhancementMetadata {
  promptEnhanced: EnhancedPromptResult;
  parametersOptimized: SdxlParameterOptimization;
  ionStyle: string;
  animeLike: boolean;
  checkpointId: string;
  processedAt: string;
}

export function buildSdxlEnhancementMetadata(
  promptText: string,
  styleFamily: StyleFamilyId | undefined,
  animeLike: boolean,
  checkpointId: string
): SdxlEnhancementMetadata {
  const promptEnhanced = buildIonEnhancedSdxlPrompt(promptText, {
    animeLike,
    styleFamily,
    checkpointId,
  });

  const parametersOptimized = optimizeSdxlParameters(styleFamily, animeLike);

  return {
    promptEnhanced,
    parametersOptimized,
    ionStyle: styleFamily || 'auto',
    animeLike,
    checkpointId,
    processedAt: new Date().toISOString(),
  };
}
