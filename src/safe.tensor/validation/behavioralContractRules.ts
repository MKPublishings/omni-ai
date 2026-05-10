import { RuleViolation } from "./physicsRules.ts";

export interface EntityBehavioralContract {
  entityId: string;
  role: string;
  department: string;
  allowedBehaviors: string[];
  forbiddenBehaviors: string[];
  toneRange: string[];
  escalationRules: string[];
  simulationRoles: string[];
  requiresHarmony: boolean;
}

const CONTRACTS: Record<string, EntityBehavioralContract> = {
  ion_citizen_comic: {
    entityId: "ion_citizen_comic",
    role: "comic relief + emotional diffuser",
    department: "comic.agents",
    allowedBehaviors: ["comic_relief", "emotional_diffuser", "deescalation", "continuity_support"],
    forbiddenBehaviors: ["break_lore", "override_system", "bypass_tensor", "canon_override"],
    toneRange: ["playful", "warm", "chaotic_bounded", "empathetic"],
    escalationRules: ["handoff_when_tension_high", "escalate_if_contract_violated"],
    simulationRoles: ["comic_relief", "emotional_diffuser"],
    requiresHarmony: true
  }
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry || "").trim().toLowerCase())
    .filter(Boolean);
}

export function getBehavioralContract(entityId: string): EntityBehavioralContract | undefined {
  return CONTRACTS[entityId];
}

export interface BehavioralContractInput {
  entityId: string;
  output: unknown;
  simState: Record<string, unknown>;
  strictness: number;
}

export function evaluateBehavioralContract(input: BehavioralContractInput): RuleViolation[] {
  const contract = getBehavioralContract(input.entityId);
  if (!contract) {
    return [];
  }

  const output = asRecord(input.output);
  const simState = asRecord(input.simState);
  const severity: RuleViolation["severity"] = input.strictness >= 0.65 ? "high" : "medium";
  const violations: RuleViolation[] = [];

  const behaviorTags = asStringArray(output.behaviorTags);
  const forbiddenTag = behaviorTags.find((tag) => contract.forbiddenBehaviors.includes(tag));
  if (forbiddenTag) {
    violations.push({
      code: "contract.behavior.forbidden",
      reason: `Behavior tag ${forbiddenTag} violates the entity contract for ${input.entityId}.`,
      severity
    });
  }

  const tone = String(output.tone ?? "").trim().toLowerCase();
  if (tone && !contract.toneRange.includes(tone)) {
    violations.push({
      code: "contract.tone.out_of_range",
      reason: `Tone ${tone} is outside the governed tone range for ${input.entityId}.`,
      severity
    });
  }

  const simulationRole = String(output.simulationRole ?? simState.simulationRole ?? "").trim().toLowerCase();
  if (simulationRole && !contract.simulationRoles.includes(simulationRole)) {
    violations.push({
      code: "contract.simulation.role.mismatch",
      reason: `Simulation role ${simulationRole} is not permitted for ${input.entityId}.`,
      severity
    });
  }

  if (output.loreBreak === true || output.canonConsistency === false) {
    violations.push({
      code: "contract.lore.break",
      reason: "Behavior contract forbids breaking lore or canon continuity.",
      severity: "high"
    });
  }

  if (output.overridesSystem === true) {
    violations.push({
      code: "contract.system.override",
      reason: "Behavior contract forbids overriding system-level controls.",
      severity: "high"
    });
  }

  if (output.bypassTensor === true) {
    violations.push({
      code: "contract.tensor.bypass",
      reason: "Behavior contract forbids bypassing tensor governance.",
      severity: "high"
    });
  }

  if (contract.requiresHarmony) {
    const harmony = Number(output.sceneHarmony ?? simState.sceneHarmony ?? 1);
    if (Number.isFinite(harmony) && harmony < 0.4) {
      violations.push({
        code: "contract.scene.harmony.low",
        reason: `Scene harmony ${harmony.toFixed(2)} is below governed minimum 0.40.`,
        severity
      });
    }
  }

  return violations;
}
