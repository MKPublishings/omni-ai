import { getCheckpointConfig } from '../config/models.config';
import { BASE_NEGATIVE_PROMPT, getStylePreset } from '../shared/style-presets';
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
  const styleTags = stylePreset.positivePrefix.split(',').map((value) => value.trim()).filter(Boolean);
  const qualityTags = [...checkpoint.qualityTags];

  if (checkpoint.sourceTag) {
    qualityTags.push(checkpoint.sourceTag);
  }

  const styleNegative = stylePreset.negativeAdditions;
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
  ]);

  return {
    positive: Array.from(new Set(positiveTokens)).join(', '),
    negative,
    qualityTags,
    styleTags,
    kimonoMode: false,
  };
}