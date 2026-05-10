export interface VisualSceneState {
  camera: string;
  characters: string[];
  location: string;
  timeOfDay: string;
}

export interface NormalizedVisualSceneSimState {
  department: string;
  stage: string;
  canonLock: boolean;
  requiresCausalConsistency: boolean;
  modality: string;
  intentValidationRequired: boolean;
  intentValidated: boolean;
  requiredCanonTags: string[];
  scene: VisualSceneState;
  raw: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function normalizeString(value: unknown, fallback: string): string {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry ?? '').trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeVisualSceneSimState(
  simState: unknown,
  fallbackDepartment = 'media_generation',
): NormalizedVisualSceneSimState {
  const raw = asRecord(simState);
  const rawScene = asRecord(raw.scene);

  return {
    department: normalizeString(raw.department, fallbackDepartment),
    stage: normalizeString(raw.stage, 'render_generation'),
    canonLock: raw.canonLock === true,
    requiresCausalConsistency: raw.requiresCausalConsistency !== false,
    modality: normalizeString(raw.modality, 'image').toLowerCase(),
    intentValidationRequired: raw.intentValidationRequired !== false,
    intentValidated: raw.intentValidated !== false,
    requiredCanonTags: normalizeStringList(raw.requiredCanonTags),
    scene: {
      camera: normalizeString(rawScene.camera ?? raw.camera, 'unspecified').toLowerCase(),
      characters: normalizeStringList(rawScene.characters ?? raw.characters),
      location: normalizeString(rawScene.location ?? raw.location, 'unspecified').toLowerCase(),
      timeOfDay: normalizeString(rawScene.timeOfDay ?? raw.timeOfDay, 'unspecified').toLowerCase(),
    },
    raw,
  };
}

export function toTensorSimState(simState: NormalizedVisualSceneSimState): Record<string, unknown> {
  return {
    ...simState.raw,
    department: simState.department,
    stage: simState.stage,
    canonLock: simState.canonLock,
    requiresCausalConsistency: simState.requiresCausalConsistency,
    modality: simState.modality,
    intentValidationRequired: simState.intentValidationRequired,
    intentValidated: simState.intentValidated,
    requiredCanonTags: simState.requiredCanonTags,
    scene: {
      ...asRecord(simState.raw.scene),
      camera: simState.scene.camera,
      characters: simState.scene.characters,
      location: simState.scene.location,
      timeOfDay: simState.scene.timeOfDay,
    },
  };
}
