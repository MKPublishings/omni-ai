export const ION_IMAGE_DEFAULT_QUALITY = "ultra";
export const ION_IMAGE_DEFAULT_RATIO = "9:16";
export const ION_IMAGE_DEFAULT_RESOLUTION = "4k";
export const ION_IMAGE_DEFAULT_WIDTH = 2160;
export const ION_IMAGE_DEFAULT_HEIGHT = 3840;
export const ION_IMAGE_PROMPT_MAX_CHARS = 10000;

const ION_ENVIRONMENTS = [
  "bedroom", "room", "forest", "city", "street", "cafe", "office",
  "studio", "kitchen", "mountains", "desert", "classroom",
  "library", "garage", "basement", "attic", "garden", "cathedral",
];

function sanitizePromptText(prompt: string): string {
  return String(prompt || "")
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEnvironmentKeywords(prompt: string): string[] {
  const lower = String(prompt || "").toLowerCase();
  return ION_ENVIRONMENTS.filter((value) => lower.includes(value));
}

export function inferStyleFromPrompt(prompt: string): string {
  const lower = String(prompt || "").toLowerCase();
  if (!lower) return "";

  const candidates: Array<{ style: string; pattern: RegExp }> = [
    { style: "hyper-real", pattern: /\b(hyper\s*real|hyperreal|photo\s*real|photoreal|photorealistic|photographic|photo[-\s]?realistic)\b/i },
    { style: "semi-realistic", pattern: /\b(semi\s*realistic|stylized\s*realism|semi\s*real)\b/i },
    { style: "vector", pattern: /\b(vector\s*art|flat\s*vector|flat\s*design|svg\s*style)\b/i },
    { style: "logo", pattern: /\b(logo\s*design|brand\s*mark|logomark|wordmark)\b/i },
    { style: "monochrome", pattern: /\b(monochrome|black\s*and\s*white|grayscale|greyscale)\b/i },
    { style: "sketch", pattern: /\b(sketch|pencil\s*sketch|graphite|line\s*drawing|hand\s*drawn)\b/i },
    { style: "vfx", pattern: /\b(vfx|cinematic\s*vfx|glitch\s*effect|holographic|particle\s*effects)\b/i },
    { style: "text", pattern: /\b(typography|text\s*design|lettering|word\s*art)\b/i },
    { style: "3d", pattern: /\b(3d|three\s*dimensional|cgi|rendered\s*3d)\b/i },
    { style: "realistic", pattern: /\b(realistic|lifelike|natural\s*imperfections|photo\s*quality)\b/i },
  ];

  for (const candidate of candidates) {
    if (candidate.pattern.test(lower)) return candidate.style;
  }

  return "";
}

export function inferCameraFromPrompt(prompt: string): string {
  const lower = String(prompt || "").toLowerCase();
  if (!lower) return "";
  if (/\b(full[-\s]?body|full[-\s]?length|head[-\s]?to[-\s]?toe|whole\s+body|entire\s+figure|standing\s+pose|body\s+shot)\b/i.test(lower)) return "wide-35mm";
  if (/\b(85mm|subject lens|subject shot|headshot|bokeh shot)\b/i.test(lower)) return "prime-85mm";
  if (/\b(35mm|wide angle|wide-angle|environmental shot|street photo)\b/i.test(lower)) return "wide-35mm";
  if (/\b(macro|close-up macro|extreme close-up|micro detail|micro-detail)\b/i.test(lower)) return "macro";
  if (/\b(135mm|telephoto|compressed background|long lens)\b/i.test(lower)) return "telephoto-135mm";
  return "";
}

export function inferLightingFromPrompt(prompt: string): string {
  const lower = String(prompt || "").toLowerCase();
  if (!lower) return "";
  if (/\b(soft studio|beauty light|diffused studio|softbox)\b/i.test(lower)) return "studio-soft";
  if (/\b(hard studio|hard light|sharp shadows|high contrast studio)\b/i.test(lower)) return "studio-hard";
  if (/\b(natural daylight|daylight|golden hour daylight|outdoor sunlight)\b/i.test(lower)) return "natural-daylight";
  if (/\b(low[-\s]?key|moody lighting|dramatic shadows|cinematic low key)\b/i.test(lower)) return "cinematic-lowkey";
  return "";
}

export function inferMaterialsFromPrompt(prompt: string): string[] {
  const lower = String(prompt || "").toLowerCase();
  if (!lower) return [];
  const inferred: string[] = [];
  if (/\b(skin|subject skin|face texture|pores)\b/i.test(lower)) inferred.push("skin");
  if (/\b(fabric|cloth|textile|cotton|silk|denim|wool)\b/i.test(lower)) inferred.push("fabric");
  if (/\b(metal|chrome|steel|iron|aluminum|brushed metal)\b/i.test(lower)) inferred.push("metal");
  if (/\b(glass|crystal|transparent|refraction|window pane)\b/i.test(lower)) inferred.push("glass");
  return Array.from(new Set(inferred));
}

type NormalizedImageGenerationError = { status: number; code: string; message: string; details?: string };

const IMAGE_ERROR_PRESETS = {
  safetyBlocked: { status: 403, code: "safety-blocked", message: "Prompt requires a safety-context adjustment." },
  providerUnavailable: { status: 503, code: "provider-unavailable", message: "Image provider is temporarily unavailable. Retry shortly." },
  providerTimeout: { status: 504, code: "provider-timeout", message: "Image generation timed out. Please retry." },
  providerPolicyBlocked: { status: 422, code: "provider-policy-blocked", message: "Image provider requested a safety-context adjustment for this prompt." },
  promptTooLong: { status: 400, code: "prompt-too-long", message: "Prompt is too long for the image provider. Shorten the prompt and retry." },
  genericFailure: { status: 500, code: "image-generation-failed", message: "Image generation failed." },
} as const;

function withDetails(
  preset: { status: number; code: string; message: string },
  rawMessage: string,
): NormalizedImageGenerationError {
  return {
    ...preset,
    details: rawMessage || undefined,
  };
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

export function normalizeImageGenerationError(err: any): NormalizedImageGenerationError {
  const rawCode = String(err?.name || err?.code || "").trim().toUpperCase();
  const rawMessage = String(err?.message || err?.error || "").trim();
  const value = rawMessage.toLowerCase();

  if (rawCode === "E_SAFETY_BLOCK") return withDetails(IMAGE_ERROR_PRESETS.safetyBlocked, rawMessage);
  if (rawCode === "E_ion_DOWN") return withDetails(IMAGE_ERROR_PRESETS.providerUnavailable, rawMessage);
  if (rawCode === "E_TIMEOUT") return withDetails(IMAGE_ERROR_PRESETS.providerTimeout, rawMessage);

  if (/request failed \(4\d\d\) for \/prompt/i.test(rawMessage)) {
    return withDetails(IMAGE_ERROR_PRESETS.providerUnavailable, rawMessage);
  }

  if (includesAny(value, ["moderat", "safety", "policy", "nsfw", "unsafe", "content blocked"])) {
    return withDetails(IMAGE_ERROR_PRESETS.providerPolicyBlocked, rawMessage);
  }

  const isPromptTooLong =
    includesAny(value, ["too long", "context length", "max tokens", "input is too large", "length of '/prompt'"]) ||
    (/must be\s*<=\s*\d+/.test(value) && value.includes("prompt"));
  if (isPromptTooLong) {
    return withDetails(IMAGE_ERROR_PRESETS.promptTooLong, rawMessage);
  }

  if (includesAny(value, ["timeout", "timed out", "deadline"])) {
    return withDetails(IMAGE_ERROR_PRESETS.providerTimeout, rawMessage);
  }

  if (includesAny(value, ["unavailable", "overloaded", "rate limit"])) {
    return withDetails(IMAGE_ERROR_PRESETS.providerUnavailable, rawMessage);
  }

  return withDetails(IMAGE_ERROR_PRESETS.genericFailure, rawMessage);
}
