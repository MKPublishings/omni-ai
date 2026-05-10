import type { ParsedIntent } from '../shared/types';

export type VariationMode = 'off' | 'balanced' | 'high';
export type KimonoStyleProfileId = 'soft_spring' | 'twilight_festival' | 'snowy_temple';
export type CompositionPreset = 'portrait' | 'full_body' | 'cinematic';

export interface StyleProfile {
  name: string;
  lighting: string;
  palette: string;
  environment: string;
}

export interface KimonoPromptOptions {
  expandedTags: string[];
  stylePrefixTags: string[];
  styleProfile?: KimonoStyleProfileId | null;
  variationMode?: VariationMode | null;
  anatomyStrictMode?: boolean;
}

export interface KimonoPromptBundle {
  positiveTokens: string[];
  negativeTokens: string[];
  styleTags: string[];
  profileId: KimonoStyleProfileId;
  compositionPreset: CompositionPreset;
}

export const NEG_BASE = [
  'extra arms',
  'extra legs',
  'extra fingers',
  'fused fingers',
  'deformed hands',
  'broken limbs',
  'distorted face',
  'asymmetrical eyes',
  'melted fabric',
  'random text',
  'watermark',
  'logo',
];

export const NEG_KIMONO = [
  'incorrect kimono wrap',
  'random armor',
  'sci-fi elements',
  'modern clothing',
  'floating fabric',
  'melted clothing',
  'random patterns',
];

const KIMONO_MUST_HAVE = [
  'correct kimono wrap',
  'realistic fabric folds',
  'pattern following fabric',
  'accurate obi placement',
  'traditional kimono etiquette',
];

const ANATOMY_POSITIVE = [
  'full body',
  'visible hands',
  'accurate anatomy',
  'natural shoulders',
  'correct proportions',
  'detailed fingers',
  'elegant hand pose',
];

const ANATOMY_NEGATIVE = [
  'extra limbs',
  'extra fingers',
  'deformed hands',
  'broken anatomy',
  'twisted neck',
  'dislocated shoulders',
];

const LIGHTING_POSITIVE = [
  'cinematic lighting',
  'clear light direction',
  'soft rim light',
  'volumetric light through blossoms',
  'depth of field',
  'foreground petals',
];

const LIGHTING_NEGATIVE = ['flat lighting', 'overexposed', 'muddy shadows', 'random blur'];

const STYLE_PROFILES: Record<KimonoStyleProfileId, StyleProfile> = {
  soft_spring: {
    name: 'Soft Spring Noon',
    lighting: 'soft spring daylight with filtered blossom shadows',
    palette: 'rose pink, peach, coral red, warm ivory',
    environment: 'temple courtyard under cherry blossoms',
  },
  twilight_festival: {
    name: 'Twilight Festival',
    lighting: 'lantern-lit dusk with warm rim lighting',
    palette: 'crimson, amber lantern light, deep rose, indigo twilight',
    environment: 'night festival path with shrine gate and paper lanterns',
  },
  snowy_temple: {
    name: 'Snowy Temple',
    lighting: 'cold moonlit ambience with gentle warm key light',
    palette: 'frost white, sakura pink accents, muted red, silver blue',
    environment: 'snow-dusted temple garden with distant pagoda',
  },
};

const POSE_VARIANTS = [
  'front view',
  'profile view',
  'back view with over-shoulder glance',
  'dynamic walking pose',
];

const ENVIRONMENT_VARIANTS = [
  'shrine gate in background',
  'riverside under cherry blossoms',
  'night festival lanterns',
  'temple courtyard',
];

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function splitCsv(prompt: string): string[] {
  return unique(prompt.split(',').map((value) => value.trim()));
}

function stableIndex(text: string, modulo: number): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % Math.max(1, modulo);
}

export function isKimonoSpringPrompt(prompt: string): boolean {
  const lower = String(prompt || '').toLowerCase();
  return /(kimono|hanfu|obi|sakura|cherry blossom|shrine|temple courtyard)/.test(lower);
}

function resolveVariationMode(mode: VariationMode | null | undefined): VariationMode {
  if (mode === 'off' || mode === 'high') {
    return mode;
  }
  return 'balanced';
}

function resolveStyleProfile(prompt: string, requestedProfile?: KimonoStyleProfileId | null): KimonoStyleProfileId {
  if (requestedProfile && STYLE_PROFILES[requestedProfile]) {
    return requestedProfile;
  }

  if (/snow|winter|frost|moonlight/.test(prompt.toLowerCase())) {
    return 'snowy_temple';
  }

  if (/festival|lantern|night/.test(prompt.toLowerCase())) {
    return 'twilight_festival';
  }

  return 'soft_spring';
}

export function buildKimonoPromptBundle(intent: ParsedIntent, options: KimonoPromptOptions): KimonoPromptBundle {
  const variationMode = resolveVariationMode(options.variationMode);
  const lower = intent.rawPrompt.toLowerCase();
  const profileId = resolveStyleProfile(lower, options.styleProfile);
  const profile = STYLE_PROFILES[profileId];

  const pose = variationMode === 'off'
    ? 'front view'
    : POSE_VARIANTS[stableIndex(intent.rawPrompt, POSE_VARIANTS.length)];

  const environment = variationMode === 'high'
    ? ENVIRONMENT_VARIANTS[stableIndex(`${intent.rawPrompt}:env`, ENVIRONMENT_VARIANTS.length)]
    : profile.environment;

  const compositionPreset: CompositionPreset = options.anatomyStrictMode ? 'full_body' : 'portrait';

  const styleTags = [
    profile.name,
    profile.lighting,
    profile.palette,
    environment,
    pose,
    'coherent cherry blossom atmosphere',
  ];

  const positiveTokens = unique([
    ...options.stylePrefixTags,
    ...options.expandedTags,
    ...KIMONO_MUST_HAVE,
    ...LIGHTING_POSITIVE,
    ...(options.anatomyStrictMode ? ANATOMY_POSITIVE : []),
    ...styleTags,
  ]);

  const negativeTokens = unique([
    ...NEG_BASE,
    ...NEG_KIMONO,
    ...LIGHTING_NEGATIVE,
    ...(options.anatomyStrictMode ? ANATOMY_NEGATIVE : []),
  ]);

  return {
    positiveTokens,
    negativeTokens,
    styleTags,
    profileId,
    compositionPreset,
  };
}

export function mergeNegativePrompts(parts: Array<string | null | undefined>): string {
  const tokens = unique(parts.flatMap((part) => splitCsv(String(part || ''))));
  return tokens.join(', ');
}
