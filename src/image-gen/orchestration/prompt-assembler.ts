import { getCheckpointConfig } from '../config/models.config';
import { BASE_NEGATIVE_PROMPT, getStylePreset } from '../shared/style-presets';
import type {
  ParsedIntent,
  PromptAssemblyResult,
  StyleFamilyId,
  TagExpansionResult,
} from '../shared/types';

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
): PromptAssemblyResult {
  const checkpoint = getCheckpointConfig(checkpointId);
  const stylePreset = getStylePreset(styleFamily);
  const styleTags = stylePreset.positivePrefix.split(',').map((value) => value.trim()).filter(Boolean);
  const qualityTags = [...checkpoint.qualityTags];

  if (checkpoint.sourceTag) {
    qualityTags.push(checkpoint.sourceTag);
  }

  const positiveTokens = [...qualityTags, ...styleTags, ...expanded.tags];
  const negativeTokens = [
    ...BASE_NEGATIVE_PROMPT.split(',').map((value) => value.trim()),
    ...stylePreset.negativeAdditions.split(',').map((value) => value.trim()),
    ...buildStrictNegatives(intent),
  ];

  return {
    positive: Array.from(new Set(positiveTokens)).join(', '),
    negative: Array.from(new Set(negativeTokens.filter(Boolean))).join(', '),
    qualityTags,
    styleTags,
  };
}