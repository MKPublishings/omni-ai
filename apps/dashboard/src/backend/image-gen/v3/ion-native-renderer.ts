import type { GenerationRequest } from '../shared/types';

interface IonNativeRenderResult {
  imageDataUrl: string;
  mimeType: string;
}

function escapeXml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
}

function stringHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function toHsl(hash: number, offset: number, saturation: number, lightness: number): string {
  const hue = (hash + offset) % 360;
  const sat = clamp(saturation, 30, 96);
  const lit = clamp(lightness, 18, 90);
  return `hsl(${hue} ${sat}% ${lit}%)`;
}

function buildVisualTokens(request: GenerationRequest) {
  const seedBase = `${request.requestId}:${request.prompt.positive}:${request.parameters.seed}`;
  const hash = stringHash(seedBase);

  return {
    backgroundA: toHsl(hash, 0, 68, 16),
    backgroundB: toHsl(hash, 60, 78, 28),
    accentA: toHsl(hash, 140, 92, 62),
    accentB: toHsl(hash, 240, 88, 68),
    accentC: toHsl(hash, 310, 74, 58),
    grainOpacity: (0.06 + (hash % 20) / 100).toFixed(3),
    ringOffset: 90 + (hash % 220),
  };
}

function promptHeadline(value: string): string {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'ION image generation';
  }

  return normalized.length > 96 ? `${normalized.slice(0, 93)}...` : normalized;
}

function toBase64(value: string): string {
  const encoded = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of encoded) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function buildSvg(request: GenerationRequest): string {
  const width = Math.max(512, Math.trunc(request.parameters.width || 1024));
  const height = Math.max(512, Math.trunc(request.parameters.height || 1024));
  const styleName = request.ionMetadata.styleFamily;
  const title = promptHeadline(request.ionMetadata.originalUserPrompt);
  const tokens = buildVisualTokens(request);

  const orbitRadius = Math.round(Math.min(width, height) * 0.24);
  const centerX = Math.round(width * 0.5);
  const centerY = Math.round(height * 0.48);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="ION native render">`,
    '<defs>',
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tokens.backgroundA}"/><stop offset="1" stop-color="${tokens.backgroundB}"/></linearGradient>`,
    `<radialGradient id="flareA" cx="20%" cy="18%" r="65%"><stop offset="0" stop-color="${tokens.accentA}" stop-opacity="0.72"/><stop offset="1" stop-color="${tokens.accentA}" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="flareB" cx="78%" cy="22%" r="58%"><stop offset="0" stop-color="${tokens.accentB}" stop-opacity="0.78"/><stop offset="1" stop-color="${tokens.accentB}" stop-opacity="0"/></radialGradient>`,
    `<filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>`,
    '<pattern id="grain" width="60" height="60" patternUnits="userSpaceOnUse">',
    `<circle cx="6" cy="9" r="1" fill="white" fill-opacity="${tokens.grainOpacity}"/>`,
    `<circle cx="22" cy="17" r="1" fill="white" fill-opacity="${tokens.grainOpacity}"/>`,
    `<circle cx="35" cy="42" r="1" fill="white" fill-opacity="${tokens.grainOpacity}"/>`,
    `<circle cx="48" cy="24" r="1" fill="white" fill-opacity="${tokens.grainOpacity}"/>`,
    '</pattern>',
    '</defs>',
    '<rect width="100%" height="100%" fill="url(#bg)"/>',
    '<rect width="100%" height="100%" fill="url(#grain)"/>',
    '<rect width="100%" height="100%" fill="url(#flareA)"/>',
    '<rect width="100%" height="100%" fill="url(#flareB)"/>',
    `<circle cx="${centerX}" cy="${centerY}" r="${orbitRadius}" fill="none" stroke="${tokens.accentC}" stroke-opacity="0.34" stroke-width="3"/>`,
    `<circle cx="${centerX + Math.round(orbitRadius * 0.74)}" cy="${centerY - Math.round(orbitRadius * 0.1)}" r="${Math.round(orbitRadius * 0.22)}" fill="${tokens.accentB}" fill-opacity="0.5" filter="url(#blur)"/>`,
    `<path d="M ${Math.round(width * 0.12)} ${Math.round(height * 0.72)} C ${Math.round(width * 0.35)} ${Math.round(height * 0.55)}, ${Math.round(width * 0.58)} ${Math.round(height * 0.86)}, ${Math.round(width * 0.85)} ${Math.round(height * 0.64)}" stroke="${tokens.accentA}" stroke-width="8" stroke-linecap="round" stroke-opacity="0.32" fill="none"/>`,
    `<text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.88)}" fill="rgba(244,249,255,0.96)" font-size="${Math.max(24, Math.round(width * 0.030))}" font-family="Georgia, Times New Roman, serif" font-weight="700">ION Native ${escapeXml(styleName)}</text>`,
    `<text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.93)}" fill="rgba(236,244,255,0.78)" font-size="${Math.max(16, Math.round(width * 0.015))}" font-family="Georgia, Times New Roman, serif">${escapeXml(title)}</text>`,
    `<text x="${Math.round(width * 0.08)}" y="${Math.round(height * 0.97)}" fill="rgba(220,235,255,0.52)" font-size="${Math.max(13, Math.round(width * 0.012))}" font-family="Georgia, Times New Roman, serif">seed ${request.parameters.seed} · ion-native-fast-render · ${request.model.checkpoint}</text>`,
    '</svg>',
  ].join('');
}

export function renderIonNativeImage(request: GenerationRequest): IonNativeRenderResult {
  const svg = buildSvg(request);
  const encoded = toBase64(svg);

  return {
    imageDataUrl: `data:image/svg+xml;base64,${encoded}`,
    mimeType: 'image/svg+xml',
  };
}
