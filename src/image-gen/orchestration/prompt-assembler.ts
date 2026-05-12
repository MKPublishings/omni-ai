import { getCheckpointConfig } from '../config/models.config';
import { BASE_NEGATIVE_PROMPT, getStylePreset } from '../shared/style-presets';
import { buildPhotogrammetryBlueprint, mergePromptTokens } from './photogrammetry-blueprint';
import {
  buildKimonoPromptBundle,
  isKimonoSpringPrompt,
  mergeNegativePrompts,
} from '../prompts/kimonoSpring';
import type {
  ImageVariationMode,
  KimonoStyleProfileId,
  ParsedIntent,
  PromptAssemblyResult,
  StyleFamilyId,
  TagExpansionResult,
} from '../shared/types';

export interface PromptAssemblyOptions {
  variationMode?: ImageVariationMode | null;
  anatomyStrictMode?: boolean;
  styleProfile?: KimonoStyleProfileId | null;
}

function isPhotorealLandscapePrompt(prompt: string): boolean {
  const lower = String(prompt || '').toLowerCase();
  const photoreal = /(photo[-\s]?realistic|photorealistic|realistic|cinema photo|dslr|natural light)/.test(lower);
  const landscape = /(desert|landscape|vista|panorama|mountain|forest|cityscape|street scene|skyline|ocean|beach|valley|canyon|dune|oasis)/.test(lower);
  return photoreal && landscape;
}

function buildStrictNegatives(intent: ParsedIntent): string[] {
  const negatives: string[] = [];
  const lower = intent.rawPrompt.toLowerCase();

  if (!/(night|midnight|starry)/.test(lower)) {
    negatives.push('starry_sky');
  }

  if (!/(person|people|girl|boy|woman|man|character|warrior)/.test(lower)) {
    negatives.push('people', 'characters', 'human');
  }

  return negatives;
}

export function assemblePrompt(
  checkpointId: string,
  styleFamily: StyleFamilyId,
  intent: ParsedIntent,
  expanded: TagExpansionResult,
  options: PromptAssemblyOptions = {},
): PromptAssemblyResult {
  const checkpoint = getCheckpointConfig(checkpointId);
  const stylePreset = getStylePreset(styleFamily);
  const forcePhotorealLandscape = isPhotorealLandscapePrompt(intent.rawPrompt);
  const styleTags = forcePhotorealLandscape
    ? ['photorealistic', 'cinematic lighting', 'natural color tones', 'landscape photography']
    : stylePreset.positivePrefix.split(',').map((value) => value.trim()).filter(Boolean);
  const qualityTags = [...checkpoint.qualityTags];
  const photogrammetry = buildPhotogrammetryBlueprint(intent.rawPrompt);

  if (checkpoint.sourceTag) {
    qualityTags.push(checkpoint.sourceTag);
  }

  qualityTags.push(...photogrammetry.positiveTags);

  const styleNegative = forcePhotorealLandscape
    ? 'anime, illustration, cartoon, painting, portrait, close-up face'
    : stylePreset.negativeAdditions;
  const strictNegative = buildStrictNegatives(intent).join(', ');
  const shouldUseKimonoMode = isKimonoSpringPrompt(intent.rawPrompt) || Boolean(options.styleProfile);

  if (shouldUseKimonoMode) {
    const kimono = buildKimonoPromptBundle(intent, {
      expandedTags: expanded.tags,
      stylePrefixTags: styleTags,
      variationMode: options.variationMode,
      anatomyStrictMode: Boolean(options.anatomyStrictMode),
      styleProfile: options.styleProfile,
    });

    return {
      positive: Array.from(new Set([...qualityTags, ...kimono.positiveTokens])).join(', '),
      negative: mergeNegativePrompts([
        BASE_NEGATIVE_PROMPT,
        styleNegative,
        strictNegative,
        photogrammetry.negativeTags.join(', '),
        kimono.negativeTokens.join(', '),
      ]),
      qualityTags,
      styleTags: Array.from(new Set([...styleTags, ...kimono.styleTags])),
      styleProfileId: kimono.profileId,
      compositionPreset: kimono.compositionPreset,
      kimonoMode: true,
    };
  }

  const positiveTokens = [...qualityTags, ...styleTags, ...expanded.tags];
  const negative = mergeNegativePrompts([
    BASE_NEGATIVE_PROMPT,
    styleNegative,
    strictNegative,
    photogrammetry.negativeTags.join(', '),
  ]);

  return {
    positive: mergePromptTokens(positiveTokens),
    negative,
    qualityTags,
    styleTags,
    kimonoMode: false,
  };
}