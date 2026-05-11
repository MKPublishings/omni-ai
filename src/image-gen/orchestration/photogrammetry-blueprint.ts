import type { ImageSampler, ImageScheduler } from '../shared/types';

export interface PhotogrammetryBlueprint {
  enabled: boolean;
  captureMode: 'portrait' | 'product' | 'environment' | 'scene' | 'general' | 'disabled';
  requestedSubjects: number;
  positiveTags: string[];
  negativeTags: string[];
}

export interface PhotogrammetryRenderTuning {
  enabled: boolean;
  captureMode: PhotogrammetryBlueprint['captureMode'];
  targetSteps: number;
  targetGuidance: number;
  sampler: ImageSampler;
  scheduler: ImageScheduler;
}

function countRequestedSubjects(prompt: string): number {
  const lower = String(prompt || '').toLowerCase();

  if (/\b(crowd|group|team|family|people|characters)\b/.test(lower)) {
    return 3;
  }

  if (/\b(couple|duo|two people|two characters|pair)\b/.test(lower)) {
    return 2;
  }

  if (/\b(single subject|solo|portrait|headshot|selfie|one person|one character|individual)\b/.test(lower)) {
    return 1;
  }

  return 0;
}

function inferCaptureMode(prompt: string): PhotogrammetryBlueprint['captureMode'] {
  const lower = String(prompt || '').toLowerCase();

  if (/\b(product|packshot|still life|device|watch|bottle|shoe|chair|furniture)\b/.test(lower)) {
    return 'product';
  }

  if (/\b(interior|room|bedroom|office|studio|kitchen|architecture|lobby)\b/.test(lower)) {
    return 'environment';
  }

  if (/\b(landscape|vista|mountain|forest|cityscape|street scene|panorama)\b/.test(lower)) {
    return 'scene';
  }

  if (/\b(portrait|headshot|selfie|face|person|model|editorial)\b/.test(lower)) {
    return 'portrait';
  }

  return 'general';
}

function shouldEnablePhotogrammetry(prompt: string): boolean {
  const lower = String(prompt || '').toLowerCase();
  if (!lower.trim()) {
    return false;
  }

  return !/\b(anime|manga|waifu|niji|chibi|cel\s*shad|cartoon|illustration|ghibli)\b/.test(lower);
}

function buildPositiveTags(captureMode: PhotogrammetryBlueprint['captureMode'], requestedSubjects: number): string[] {
  const tags = [
    'photogrammetry-grade scene reconstruction',
    'stable lens geometry',
    'clean occlusion boundaries',
    'resolved foreground midground background separation',
    'single coherent light transport',
    'material-consistent surfaces',
    'artifact-free edge transitions',
  ];

  if (requestedSubjects === 1) {
    tags.push(
      'single clearly isolated subject',
      'unobscured face and body silhouette unless requested',
      'non-overlapping limbs and features',
    );
  }

  if (requestedSubjects > 1) {
    tags.push(
      'distinct subject spacing',
      'independent silhouettes for each subject',
      'staged poses with no merged anatomy',
    );
  }

  if (captureMode === 'portrait') {
    tags.push(
      'true-to-lens facial proportions',
      'clear eye visibility',
      'natural skin detail without smearing',
    );
  }

  if (captureMode === 'product') {
    tags.push(
      'object-centered framing',
      'clean contour fidelity',
      'no floating or fused components',
    );
  }

  if (captureMode === 'environment') {
    tags.push(
      'structurally consistent architecture',
      'parallel lines preserved where expected',
      'clean room-scale perspective',
    );
  }

  if (captureMode === 'scene') {
    tags.push(
      'depth-aware environmental layering',
      'background elements fully separated from focal plane',
    );
  }

  return tags;
}

function buildNegativeTags(captureMode: PhotogrammetryBlueprint['captureMode'], requestedSubjects: number): string[] {
  const tags = [
    'no overlapping anatomy',
    'no fused limbs',
    'no duplicate body parts',
    'no obscured facial features unless requested',
    'no depth halo artifacts',
    'no warped perspective',
    'no geometry collapse',
    'no texture smearing',
    'no muddy occlusion',
    'no floating objects',
  ];

  if (requestedSubjects <= 1) {
    tags.push('no extra people', 'no duplicated subject');
  }

  if (requestedSubjects > 1) {
    tags.push('no merged faces', 'no tangled poses', 'no overlapping silhouettes');
  }

  if (captureMode === 'portrait') {
    tags.push('no crossed eyes', 'no malformed hands', 'no waxy skin', 'no hidden eyes');
  }

  if (captureMode === 'product') {
    tags.push('no broken edges', 'no asymmetrical duplication', 'no clipped product parts');
  }

  if (captureMode === 'environment') {
    tags.push('no impossible walls', 'no bent door frames', 'no inconsistent vanishing points');
  }

  return tags;
}

export function buildPhotogrammetryBlueprint(prompt: string): PhotogrammetryBlueprint {
  if (!shouldEnablePhotogrammetry(prompt)) {
    return {
      enabled: false,
      captureMode: 'disabled',
      requestedSubjects: 0,
      positiveTags: [],
      negativeTags: [],
    };
  }

  const requestedSubjects = countRequestedSubjects(prompt);
  const captureMode = inferCaptureMode(prompt);

  return {
    enabled: true,
    captureMode,
    requestedSubjects,
    positiveTags: buildPositiveTags(captureMode, requestedSubjects),
    negativeTags: buildNegativeTags(captureMode, requestedSubjects),
  };
}

export function resolvePhotogrammetryRenderTuning(prompt: string): PhotogrammetryRenderTuning | null {
  const blueprint = buildPhotogrammetryBlueprint(prompt);
  if (!blueprint.enabled) {
    return null;
  }

  const requestedSubjectsBoost = blueprint.requestedSubjects > 1 ? 2 : 0;

  if (blueprint.captureMode === 'portrait') {
    return {
      enabled: true,
      captureMode: blueprint.captureMode,
      targetSteps: 32 + requestedSubjectsBoost,
      targetGuidance: 7,
      sampler: 'dpmpp_2m_sde_heun',
      scheduler: 'karras',
    };
  }

  if (blueprint.captureMode === 'product') {
    return {
      enabled: true,
      captureMode: blueprint.captureMode,
      targetSteps: 34,
      targetGuidance: 7.5,
      sampler: 'dpmpp_2m_karras',
      scheduler: 'karras',
    };
  }

  if (blueprint.captureMode === 'environment') {
    return {
      enabled: true,
      captureMode: blueprint.captureMode,
      targetSteps: 30,
      targetGuidance: 6.8,
      sampler: 'dpmpp_2m_karras',
      scheduler: 'karras',
    };
  }

  if (blueprint.captureMode === 'scene') {
    return {
      enabled: true,
      captureMode: blueprint.captureMode,
      targetSteps: 28 + requestedSubjectsBoost,
      targetGuidance: 6.4,
      sampler: 'uni_pc',
      scheduler: 'karras',
    };
  }

  return {
    enabled: true,
    captureMode: blueprint.captureMode,
    targetSteps: 29 + requestedSubjectsBoost,
    targetGuidance: 6.8,
    sampler: 'dpmpp_2m_sde_heun',
    scheduler: 'karras',
  };
}

export function mergePromptTokens(...tokenGroups: Array<string | string[] | undefined | null>): string {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const group of tokenGroups) {
    const values = Array.isArray(group)
      ? group
      : typeof group === 'string'
        ? group.split(',')
        : [];

    for (const value of values) {
      const token = String(value || '').trim();
      const key = token.toLowerCase();
      if (!token || seen.has(key)) {
        continue;
      }

      seen.add(key);
      merged.push(token);
    }
  }

  return merged.join(', ');
}