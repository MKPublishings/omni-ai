import type { ParsedIntent } from '../shared/types';

const LANDSCAPE_SUBJECT_PATTERNS: Array<{ pattern: RegExp; subject: string }> = [
  { pattern: /\bdesert\b/i, subject: 'desert' },
  { pattern: /\bmountain(s)?\b/i, subject: 'mountain' },
  { pattern: /\bforest\b|\bwoods\b|\bgrove\b/i, subject: 'forest' },
  { pattern: /\bcity\b|\bcityscape\b|\burban\b/i, subject: 'cityscape' },
  { pattern: /\bocean\b|\bsea\b|\bbeach\b/i, subject: 'seascape' },
  { pattern: /\bvalley\b/i, subject: 'valley' },
  { pattern: /\bcanyon\b/i, subject: 'canyon' },
  { pattern: /\bskyline\b/i, subject: 'skyline' },
];

function hasLandscapeSignal(prompt: string): boolean {
  return /(desert|landscape|vista|panorama|mountain|forest|cityscape|skyline|ocean|beach|valley|canyon)/i.test(prompt);
}

function inferMood(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/(dramatic|epic|cinematic|intense|warrior|battle)/.test(lower)) return 'dramatic';
  if (/(cozy|warm|lofi|lo-fi|study|calm|peaceful)/.test(lower)) return 'cozy';
  if (/(dreamy|soft|romantic|pastel|shoujo)/.test(lower)) return 'dreamy';
  if (/(dark|gritty|seinen|ominous|noir)/.test(lower)) return 'gritty';
  if (/(retro|vhs|90s|nostalgic)/.test(lower)) return 'nostalgic';
  return 'neutral';
}

function inferSetting(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/(desert|dune|sandstorm|oasis)/.test(lower)) return 'desert';
  if (/(sunset|golden hour|cliff|mountain)/.test(lower)) return 'outdoor vista';
  if (/(bedroom|room|studio|interior|indoors)/.test(lower)) return 'interior';
  if (/(forest|woods|grove)/.test(lower)) return 'forest';
  if (/(city|street|urban|alley)/.test(lower)) return 'city';
  if (/(school|classroom)/.test(lower)) return 'school';
  return 'generic setting';
}

function inferFraming(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/(close[-\s]?up|portrait|headshot|face)/.test(lower)) return 'portrait';
  if (/(full[-\s]?body|standing|head[-\s]?to[-\s]?toe)/.test(lower)) return 'full body';
  if (/(wide shot|landscape|panorama|vista)/.test(lower)) return 'wide shot';
  if (hasLandscapeSignal(lower)) return 'wide shot';
  return 'upper body';
}

function inferTimeOfDay(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/(sunset|golden hour|dusk|twilight)/.test(lower)) return 'sunset';
  if (/(night|midnight|starry|moonlight)/.test(lower)) return 'night';
  if (/(morning|daylight|sunlight|afternoon)/.test(lower)) return 'day';
  return 'unspecified';
}

function inferSubject(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/(1girl|girl|woman|female|heroine|warrior girl)/.test(lower)) return '1girl';
  if (/(1boy|boy|man|male|warrior)/.test(lower)) return '1boy';
  if (/(couple|2 people|two people)/.test(lower)) return '2people';

  for (const entry of LANDSCAPE_SUBJECT_PATTERNS) {
    if (entry.pattern.test(lower)) {
      return entry.subject;
    }
  }

  return 'subject';
}

function inferAction(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/(standing|stands|standing on)/.test(lower)) return 'standing';
  if (/(running|sprinting)/.test(lower)) return 'running';
  if (/(sitting|seated)/.test(lower)) return 'sitting';
  if (/(fighting|battle|attacking)/.test(lower)) return 'action pose';
  return 'posed';
}

export function parseIntent(prompt: string): ParsedIntent {
  const rawPrompt = String(prompt || '').trim();

  return {
    subject: inferSubject(rawPrompt),
    action: inferAction(rawPrompt),
    mood: inferMood(rawPrompt),
    setting: inferSetting(rawPrompt),
    framing: inferFraming(rawPrompt),
    timeOfDay: inferTimeOfDay(rawPrompt),
    rawPrompt,
  };
}