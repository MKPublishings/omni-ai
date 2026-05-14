import type { ImageGenOutput, ImageGenRequest } from './imageGeneratorAdapter';
import { normalizeVisualSceneSimState } from './simStateAdapter';

export interface ImageRuleViolation {
  code: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  domain: 'narrative' | 'physics';
}

export interface ImageRuleEvaluation {
  violations: ImageRuleViolation[];
  reasons: string[];
  narrativeTags: string[];
  physicsTags: string[];
  timelineIntegrity: boolean;
  canonConsistency: boolean;
  causalConsistency: boolean;
  geometryValid: boolean;
  continuityScore: number;
  roleConsistency: number;
  systemicImpactScore: number;
  departmentPackId: string;
}

interface ImageRulePack {
  id: string;
  teleportRequiresTransition: boolean;
  allowImpossibleGeometry: boolean;
  requiredSceneAlignment: boolean;
  canonMissingSeverity: ImageRuleViolation['severity'];
  sceneMismatchSeverity: ImageRuleViolation['severity'];
  physicsContradictionSeverity: ImageRuleViolation['severity'];
  continuityPenaltyFactor: number;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function normalizeTagList(tags: string[] | undefined): string[] {
  return (Array.isArray(tags) ? tags : [])
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter(Boolean);
}

function hasTag(tags: Set<string>, prefixOrValue: string): boolean {
  if (tags.has(prefixOrValue)) {
    return true;
  }

  for (const tag of tags) {
    if (tag.startsWith(`${prefixOrValue}:`)) {
      return true;
    }
  }

  return false;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function findPrefixedTagValue(tags: Set<string>, prefix: string): string | null {
  for (const tag of tags) {
    if (tag.startsWith(`${prefix}:`)) {
      return tag.slice(prefix.length + 1).trim().toLowerCase();
    }
  }

  return null;
}

function normalizeDepartment(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
}

const DEFAULT_RULE_PACK: ImageRulePack = {
  id: 'default',
  teleportRequiresTransition: true,
  allowImpossibleGeometry: false,
  requiredSceneAlignment: false,
  canonMissingSeverity: 'medium',
  sceneMismatchSeverity: 'medium',
  physicsContradictionSeverity: 'high',
  continuityPenaltyFactor: 1,
};

const DEPARTMENT_RULE_PACKS: Record<string, ImageRulePack> = {
  visual_renders: {
    id: 'visual-renders-rd',
    teleportRequiresTransition: true,
    allowImpossibleGeometry: false,
    requiredSceneAlignment: false,
    canonMissingSeverity: 'medium',
    sceneMismatchSeverity: 'low',
    physicsContradictionSeverity: 'high',
    continuityPenaltyFactor: 0.9,
  },
  image_generation_visual_renders: {
    id: 'visual-renders-rd',
    teleportRequiresTransition: true,
    allowImpossibleGeometry: false,
    requiredSceneAlignment: false,
    canonMissingSeverity: 'medium',
    sceneMismatchSeverity: 'low',
    physicsContradictionSeverity: 'high',
    continuityPenaltyFactor: 0.9,
  },
  brand_assets: {
    id: 'brand-assets-strict',
    teleportRequiresTransition: true,
    allowImpossibleGeometry: false,
    requiredSceneAlignment: true,
    canonMissingSeverity: 'high',
    sceneMismatchSeverity: 'high',
    physicsContradictionSeverity: 'high',
    continuityPenaltyFactor: 1.2,
  },
  image_generation_brand_assets: {
    id: 'brand-assets-strict',
    teleportRequiresTransition: true,
    allowImpossibleGeometry: false,
    requiredSceneAlignment: true,
    canonMissingSeverity: 'high',
    sceneMismatchSeverity: 'high',
    physicsContradictionSeverity: 'high',
    continuityPenaltyFactor: 1.2,
  },
};

function resolveRulePack(input: { department: string; entityId: string }): ImageRulePack {
  const normalizedDepartment = normalizeDepartment(input.department);
  const byDepartment = DEPARTMENT_RULE_PACKS[normalizedDepartment];
  if (byDepartment) {
    return byDepartment;
  }

  const normalizedEntityId = normalizeDepartment(input.entityId);
  const byEntityId = DEPARTMENT_RULE_PACKS[normalizedEntityId];
  if (byEntityId) {
    return byEntityId;
  }

  return DEFAULT_RULE_PACK;
}

export function evaluateImageRules(input: {
  job: ImageGenRequest;
  output: ImageGenOutput;
  simState: unknown;
}): ImageRuleEvaluation {
  const simState = normalizeVisualSceneSimState(input.simState);
  const rulePack = resolveRulePack({
    department: simState.department,
    entityId: input.job.entityId,
  });
  const narrativeTags = normalizeTagList(input.output.narrativeTags);
  const physicsTags = normalizeTagList(input.output.physicsTags);
  const tagSet = new Set<string>([...narrativeTags, ...physicsTags]);
  const violations: ImageRuleViolation[] = [];

  const transitionPresent = hasTag(tagSet, 'transition') || hasTag(tagSet, 'portal') || hasTag(tagSet, 'cut');
  const teleportPresent = hasTag(tagSet, 'teleport') || hasTag(tagSet, 'instant-relocation');
  if (teleportPresent && rulePack.teleportRequiresTransition && !transitionPresent) {
    violations.push({
      code: 'image.timeline.teleport-without-transition',
      reason: 'Character teleport detected without a narrative transition marker.',
      severity: 'high',
      domain: 'narrative',
    });
  }

  const canonLock = simState.canonLock === true;
  const requiredCanonTags = simState.requiredCanonTags;
  if (canonLock) {
    for (const requiredTag of requiredCanonTags) {
      if (!tagSet.has(requiredTag)) {
        violations.push({
          code: 'image.canon.required-tag-missing',
          reason: `Canon lock requires tag ${requiredTag} but it was not present in model metadata.`,
          severity: rulePack.canonMissingSeverity,
          domain: 'narrative',
        });
      }
    }
  }

  if (rulePack.requiredSceneAlignment) {
    const cameraTag = findPrefixedTagValue(tagSet, 'camera');
    if (simState.scene.camera !== 'unspecified' && cameraTag && cameraTag !== simState.scene.camera) {
      violations.push({
        code: 'image.scene.camera.mismatch',
        reason: `Scene camera ${cameraTag} does not match required camera ${simState.scene.camera}.`,
        severity: rulePack.sceneMismatchSeverity,
        domain: 'narrative',
      });
    }

    const locationTag = findPrefixedTagValue(tagSet, 'location');
    if (simState.scene.location !== 'unspecified' && locationTag && locationTag !== simState.scene.location) {
      violations.push({
        code: 'image.scene.location.mismatch',
        reason: `Scene location ${locationTag} does not match required location ${simState.scene.location}.`,
        severity: rulePack.sceneMismatchSeverity,
        domain: 'narrative',
      });
    }

    const timeTag = findPrefixedTagValue(tagSet, 'time');
    if (simState.scene.timeOfDay !== 'unspecified' && timeTag && timeTag !== simState.scene.timeOfDay) {
      violations.push({
        code: 'image.scene.time.mismatch',
        reason: `Scene time ${timeTag} does not match required time ${simState.scene.timeOfDay}.`,
        severity: rulePack.sceneMismatchSeverity,
        domain: 'narrative',
      });
    }

    if (simState.scene.characters.length > 0) {
      const characterTags = new Set<string>();
      for (const tag of tagSet) {
        if (tag.startsWith('character:')) {
          characterTags.add(tag.slice('character:'.length).trim().toLowerCase());
        }
      }

      for (const requiredCharacter of simState.scene.characters) {
        if (!characterTags.has(requiredCharacter)) {
          violations.push({
            code: 'image.scene.character.missing',
            reason: `Required character ${requiredCharacter} is missing from image metadata tags.`,
            severity: rulePack.sceneMismatchSeverity,
            domain: 'narrative',
          });
        }
      }
    }
  }

  const impossibleGeometry = hasTag(tagSet, 'impossible-geometry') || hasTag(tagSet, 'non-euclidean-break');
  if (impossibleGeometry && !rulePack.allowImpossibleGeometry) {
    violations.push({
      code: 'image.physics.geometry-impossible',
      reason: 'Scene geometry tag indicates physically impossible layout for this simulation slice.',
      severity: 'high',
      domain: 'physics',
    });
  }

  const physicsContradiction = hasTag(tagSet, 'causal-break') || hasTag(tagSet, 'time-loop-contradiction');
  if (physicsContradiction) {
    violations.push({
      code: 'image.physics.causal-contradiction',
      reason: 'Output metadata indicates a causal contradiction with active simulation constraints.',
      severity: rulePack.physicsContradictionSeverity,
      domain: 'physics',
    });
  }

  const highCount = violations.filter((violation) => violation.severity === 'high').length;
  const mediumCount = violations.filter((violation) => violation.severity === 'medium').length;
  const lowCount = violations.filter((violation) => violation.severity === 'low').length;

  const continuityPenalty = (highCount * 0.42 + mediumCount * 0.22 + lowCount * 0.1) * rulePack.continuityPenaltyFactor;
  const continuityScore = clamp(1 - continuityPenalty, 0, 1);
  const roleConsistency = clamp(1 - (highCount * 0.28 + mediumCount * 0.14), 0, 1);
  const systemicImpactScore = clamp(highCount * 0.24 + mediumCount * 0.12 + lowCount * 0.05, 0, 1);

  const timelineIntegrity = !violations.some((violation) =>
    violation.code === 'image.timeline.teleport-without-transition' || violation.code === 'image.physics.causal-contradiction',
  );
  const canonConsistency = !violations.some((violation) => violation.code === 'image.canon.required-tag-missing');
  const causalConsistency = simState.requiresCausalConsistency === false
    ? true
    : !violations.some((violation) => violation.domain === 'physics');
  const geometryValid = !violations.some((violation) => violation.code === 'image.physics.geometry-impossible');

  return {
    violations,
    reasons: violations.map((violation) => violation.reason),
    narrativeTags,
    physicsTags,
    timelineIntegrity,
    canonConsistency,
    causalConsistency,
    geometryValid,
    continuityScore,
    roleConsistency,
    systemicImpactScore,
    departmentPackId: rulePack.id,
  };
}
