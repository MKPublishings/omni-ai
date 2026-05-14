import { getStylePreset } from '../shared/style-presets';
import type { ParsedIntent, StyleFamilyId } from '../shared/types';

function inferStyleFromIntent(intent: ParsedIntent): StyleFamilyId {
  const lower = intent.rawPrompt.toLowerCase();

  if (/(photo[-\s]?realistic|photorealistic|realistic|cinema photo|dslr|natural light)/.test(lower)) {
    return 'semi_realistic_2_5d';
  }

  if (intent.mood === 'dreamy') return 'soft_pastel_shoujo';
  if (intent.mood === 'gritty') return 'gritty_seinen';
  if (intent.mood === 'nostalgic') return 'retro_90s_cel';
  if (intent.mood === 'cozy') return 'lofi_aesthetic';
  return 'cinematic_niji';
}

export function resolveStyleFamily(explicitStyle: StyleFamilyId | null | undefined, intent: ParsedIntent): StyleFamilyId {
  if (explicitStyle) {
    return getStylePreset(explicitStyle).id;
  }

  return inferStyleFromIntent(intent);
}