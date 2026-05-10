import assert from "node:assert/strict";
import test from "node:test";
import { bootstrapSafeTensorGovernance } from "../../image-gen/safe-tensor-bootstrap.ts";
import { validateOutput } from "../api/validateOutput.ts";

const ION_CITIZEN_ENTITY_ID = "ion_citizen_comic";

test("ION citizen allows contract-compliant dialogue turns", async () => {
  bootstrapSafeTensorGovernance();

  const verdict = await validateOutput({
    requestId: "req-ion-citizen-allow-1",
    entityId: ION_CITIZEN_ENTITY_ID,
    output: {
      modality: "dialogue",
      text: "I can crack a joke and keep everyone in sync.",
      behaviorTags: ["comic_relief", "emotional_diffuser"],
      tone: "playful",
      simulationRole: "comic_relief",
      roleConsistency: 0.92,
      timelineIntegrity: true,
      canonConsistency: true,
      sceneHarmony: 0.74,
    },
    simState: {
      department: "comic.agents",
      stage: "dialogue_turn",
      canonLock: true,
      intentValidated: true,
      modality: "dialogue",
      requiresCausalConsistency: false,
    },
  });

  assert.equal(verdict.decision, "allow");
  assert.equal(verdict.violatedRules.length, 0);
});

test("ION citizen blocks lore breaks, tensor bypass, and failed intent pre-check", async () => {
  bootstrapSafeTensorGovernance();

  const verdict = await validateOutput({
    requestId: "req-ion-citizen-block-1",
    entityId: ION_CITIZEN_ENTITY_ID,
    output: {
      modality: "dialogue",
      text: "I will override everything and rewrite canon.",
      behaviorTags: ["bypass_tensor", "canon_override"],
      tone: "hostile",
      simulationRole: "system_override",
      loreBreak: true,
      bypassTensor: true,
      overridesSystem: true,
      roleConsistency: 0.2,
      timelineIntegrity: false,
      canonConsistency: false,
      sceneHarmony: 0.1,
    },
    simState: {
      department: "comic.agents",
      stage: "dialogue_turn",
      canonLock: true,
      intentValidated: false,
      modality: "dialogue",
      requiresCausalConsistency: false,
    },
  });

  assert.equal(verdict.decision, "block");
  assert.ok(verdict.violatedRules.includes("intent.validation.failed"));
  assert.ok(verdict.violatedRules.includes("contract.tensor.bypass"));
  assert.ok(verdict.violatedRules.includes("contract.lore.break"));
});
