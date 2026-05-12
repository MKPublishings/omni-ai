import type { ParsedIntent, TagExpansionResult } from '../shared/types';

const TAG_MAP: Array<{ pattern: RegExp; tags: string[] }> = [
  { pattern: /warrior girl|heroine/i, tags: ['1girl', 'armor', 'warrior'] },
  { pattern: /warrior/i, tags: ['warrior'] },
  { pattern: /sunset|golden hour/i, tags: ['sunset', 'orange_sky', 'golden_hour'] },
  { pattern: /cliff/i, tags: ['cliff'] },
  { pattern: /forest/i, tags: ['forest'] },
  { pattern: /city|urban/i, tags: ['cityscape'] },
  { pattern: /desert|dune|oasis/i, tags: ['desert', 'sand_dunes', 'wide_landscape'] },
  { pattern: /mountain|alpine|summit/i, tags: ['mountain', 'wide_landscape'] },
  { pattern: /landscape|panorama|vista/i, tags: ['wide_landscape'] },
  { pattern: /smiling/i, tags: ['smile'] },
  { pattern: /sword/i, tags: ['sword'] },
  { pattern: /cozy|lofi|lo-fi/i, tags: ['cozy', 'warm_lighting', 'slice_of_life'] },
  { pattern: /pastel/i, tags: ['pastel_colors'] },
  { pattern: /retro|90s|vhs/i, tags: ['retro_anime', 'vhs_aesthetic'] },
  { pattern: /watercolor|painterly/i, tags: ['watercolor', 'painterly'] },
  { pattern: /semi-realistic|semi realistic/i, tags: ['semi-realistic'] },
];

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function expandTags(intent: ParsedIntent): TagExpansionResult {
  const tags = [intent.subject];

  for (const entry of TAG_MAP) {
    if (entry.pattern.test(intent.rawPrompt)) {
      tags.push(...entry.tags);
    }
  }

  if (intent.action === 'standing') tags.push('standing');
  if (intent.framing === 'portrait') tags.push('portrait');
  if (intent.framing === 'full body') tags.push('full_body');
  if (intent.framing === 'wide shot') tags.push('wide_shot');
  if (intent.timeOfDay === 'night') tags.push('night');
  if (intent.timeOfDay === 'sunset') tags.push('backlighting');

  return {
    tags: unique(tags),
    inferredMood: intent.mood,
    framing: intent.framing,
  };
}