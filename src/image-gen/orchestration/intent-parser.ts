import type { ParsedIntent } from '../shared/types';

const LANDSCAPE_SUBJECT_PATTERNS: Array<{ pattern: RegExp; subject: string }> = [
  { pattern: /\bdesert\b/i, subject: 'desert' },
  { pattern: /\bmountain(s)?\b|\balpine\b|\bsummit\b/i, subject: 'mountain' },
  { pattern: /\bforest\b|\bwoods\b|\bgrove\b/i, subject: 'forest' },
  { pattern: /\bcity\b|\bcityscape\b|\burban\b|\bdowntown\b|\bavenue\b/i, subject: 'cityscape' },
  { pattern: /\bocean\b|\bsea\b|\bbeach\b|\bcoast(al)?\b|\bshore\b/i, subject: 'seascape' },
  { pattern: /\bvalley\b/i, subject: 'valley' },
  { pattern: /\bcanyon\b|\boverlook\b/i, subject: 'canyon' },
  { pattern: /\bskyline\b/i, subject: 'skyline' },
  { pattern: /\binterior\b|\broom\b|\boffice\b|\bkitchen\b|\blobby\b/i, subject: 'interior' },
  { pattern: /\bwatch\b|\bcamera\b|\bbottle\b|\bsneaker\b|\bshoe\b|\bchair\b|\bproduct\b/i, subject: 'product' },
  { pattern: /\bsandstone\b|\bstrata\b|\bterrain\b|\bplain\b|\briver\b|\bbridge\b|\blake\b|\broad\b/i, subject: 'landscape' },
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
  const explicitlyNotPortrait = /(no close[-\s]?ups?|no portrait|without portrait|no visible faces|no faces|no face|no headshot)/.test(lower);

  if (!explicitlyNotPortrait && /(close[-\s]?up|portrait|headshot|face)/.test(lower)) return 'portrait';
  if (/(full[-\s]?body|standing|head[-\s]?to[-\s]?toe)/.test(lower)) return 'full body';
  if (/(wide shot|wide composition|landscape|panorama|vista)/.test(lower)) return 'wide shot';
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
  const explicitNoHuman = /(no people|no humans|without people|without humans|no person|no faces|no visible faces)/.test(lower);

  if (/(\b1girl\b|\bgirl\b|\bwoman\b|\bfemale\b|\bheroine\b|warrior girl)/.test(lower)) return '1girl';
  if (/(\b1boy\b|\bboy\b|\bman\b|\bmale\b|\bwarrior\b)/.test(lower)) return '1boy';
  if (!explicitNoHuman && /(couple|2 people|two people)/.test(lower)) return '2people';
  if (!explicitNoHuman && /(\bperson\b|\bpeople\b|\bhuman\b|\bmodel\b|\btraveler\b|\bexplorer\b)/.test(lower)) return 'person';

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