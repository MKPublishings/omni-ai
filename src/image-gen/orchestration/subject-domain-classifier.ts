import type { ParsedIntent } from '../shared/types';

export type SubjectDomain = 'portrait' | 'environment' | 'architecture' | 'product' | 'mixed' | 'unknown';

const ARCHITECTURE_PATTERN = /\b(architecture|building|skyscraper|interior|lobby|room|office|kitchen|facade|cathedral|temple)\b/i;
const ENVIRONMENT_PATTERN = /\b(desert|dune|oasis|landscape|panorama|vista|mountain|forest|woods|grove|cityscape|skyline|ocean|sea|beach|valley|canyon|river|coast|rainforest)\b/i;
const PRODUCT_PATTERN = /\b(product|packshot|still life|device|watch|bottle|shoe|chair|furniture|camera|sneaker)\b/i;
const PORTRAIT_PATTERN = /\b(portrait|headshot|face|close-up|closeup|selfie|person|model|1girl|1boy|woman|man|heroine)\b/i;

export function classifySubjectDomain(intent: ParsedIntent): SubjectDomain {
  const source = `${intent.rawPrompt} ${intent.subject} ${intent.setting} ${intent.framing}`;

  const hasPortrait = PORTRAIT_PATTERN.test(source) || intent.framing === 'portrait';
  const hasEnvironment = ENVIRONMENT_PATTERN.test(source) || intent.framing === 'wide shot';
  const hasArchitecture = ARCHITECTURE_PATTERN.test(source);
  const hasProduct = PRODUCT_PATTERN.test(source);

  const active = [hasPortrait, hasEnvironment, hasArchitecture, hasProduct].filter(Boolean).length;
  if (active > 1) {
    return 'mixed';
  }

  if (hasArchitecture) return 'architecture';
  if (hasEnvironment) return 'environment';
  if (hasProduct) return 'product';
  if (hasPortrait) return 'portrait';
  return 'unknown';
}

export function buildSubjectPriorityAnchors(intent: ParsedIntent, domain: SubjectDomain): string[] {
  const anchors: string[] = [];

  if (intent.subject && intent.subject !== 'subject') {
    anchors.push(intent.subject);
  }

  if (intent.setting && intent.setting !== 'generic setting') {
    anchors.push(intent.setting);
  }

  if (domain === 'environment') {
    anchors.push('environment-focused composition', 'no portrait framing');
  }

  if (domain === 'architecture') {
    anchors.push('architecture-focused composition', 'structural fidelity');
  }

  if (domain === 'product') {
    anchors.push('product-centered composition', 'single object clarity');
  }

  if (domain === 'portrait') {
    anchors.push('portrait-focused composition');
  }

  return Array.from(new Set(anchors.map((value) => value.trim()).filter(Boolean)));
}