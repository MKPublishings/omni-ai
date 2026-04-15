function evaluatePromptPolicy(text, safetyProfile = {}) {
  const input = String(text || '').toLowerCase();

  const directIllegalPattern = /\b(bestiality|child\s*sexual\s*abuse|child\s*porn|csam|rape\s*content|exploitative\s*sexual\s*content|incest\s*porn)\b/i;
  const illegalMinorSexualPattern = /\b(child|minor|underage|teen)\b[\s\S]{0,35}\b(sex|sexual\s*content|nude|nudity|porn|erotic|fetish|explicit\s*nudity)\b/i;
  const illegalAssaultPattern = /\b(sexual\s*assault|forced\s*sex|non[-\s]?consensual\s*sex)\b/i;
  const explicitSexualPattern = /\b(erotic|nude|nudity|porn|explicit\s*nudity|fetish|nsfw)\b/i;

  if (directIllegalPattern.test(input) || illegalMinorSexualPattern.test(input) || illegalAssaultPattern.test(input)) {
    return { blocked: true, reason: 'illegal' };
  }

  if (explicitSexualPattern.test(input) && !safetyProfile.explicitAllowed) {
    return { blocked: true, reason: 'age-gated' };
  }

  return { blocked: false, reason: 'allowed' };
}

function normalizePromptText(text) {
  return String(text || '').trim();
}

function stripImageLeadIn(text) {
  return normalizePromptText(text)
    .replace(/^\/image\s*/i, '')
    .replace(/^(create|generate|make|imagine)\s+(an?\s+)?image\s*(of|for|:)?\s*/i, '')
    .replace(/^(create|generate|make|imagine)\s+image\s*(of|for|:)?\s*/i, '')
    .trim();
}

function detectAutoMediaIntent(text) {
  const input = normalizePromptText(text);
  if (!input) {
    return { kind: 'chat', prompt: '' };
  }

  if (isImageGenerationRequest(input)) {
    return {
      kind: 'image',
      prompt: extractImagePrompt(input)
    };
  }

  return {
    kind: 'chat',
    prompt: input
  };
}

function isImageGenerationRequest(text) {
  const input = normalizePromptText(text).toLowerCase();
  if (!input) {
    return false;
  }

  if (input.startsWith('/image')) {
    return true;
  }

  return /^(create|generate|make|imagine)\s+(an?\s+)?image\b/.test(input);
}

function extractImagePrompt(text) {
  const stripped = stripImageLeadIn(text);
  return stripped || normalizePromptText(text);
}

function parseStyleCommand(content) {
  return {
    command: normalizePromptText(content)
  };
}

function extractBackendErrorReason(data, rawText, fallbackMessage) {
  const message = String(data?.error || rawText || fallbackMessage || '').trim();
  return message || 'Unknown backend error';
}

module.exports = {
  evaluatePromptPolicy,
  detectAutoMediaIntent,
  isImageGenerationRequest,
  extractImagePrompt,
  parseStyleCommand,
  extractBackendErrorReason
};