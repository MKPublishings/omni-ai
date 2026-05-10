import { recordDecision } from "../api/recordDecision.ts";
import { validateOutput } from "../api/validateOutput.ts";

const ION_CITIZEN_ENTITY_ID = "ion_citizen_comic";

export interface IonCitizenDialoguePayload {
  modality: "text" | "dialogue";
  text: string;
  behaviorTags?: string[];
  tone?: string;
  simulationRole?: string;
  roleConsistency?: number;
  timelineIntegrity?: boolean;
  canonConsistency?: boolean;
  sceneHarmony?: number;
}

export interface ValidateIonCitizenDialogueInput {
  requestId: string;
  payload: IonCitizenDialoguePayload;
  simState: Record<string, unknown>;
  simStateRef?: string;
}

export async function validateIonCitizenDialogue(input: ValidateIonCitizenDialogueInput) {
  const verdict = await validateOutput({
    requestId: input.requestId,
    entityId: ION_CITIZEN_ENTITY_ID,
    output: input.payload,
    simState: {
      department: "comic.agents",
      stage: "dialogue_turn",
      canonLock: true,
      requiresCausalConsistency: false,
      intentValidationRequired: true,
      ...input.simState
    },
    simStateRef: input.simStateRef ?? `${ION_CITIZEN_ENTITY_ID}:dialogue:${input.requestId}`
  });

  return {
    allowed: verdict.decision === "allow",
    verdict
  };
}

export async function recordIonCitizenDialogueDecision(input: {
  requestId: string;
  payload: IonCitizenDialoguePayload;
  verdict: "allow" | "block" | "escalate";
  simStateRef?: string;
}) {
  return recordDecision({
    requestId: input.requestId,
    entityId: ION_CITIZEN_ENTITY_ID,
    verdict: {
      decision: input.verdict,
      reasons: [],
      violatedRules: [],
      sliceVersion: 1
    },
    simStateRef: input.simStateRef,
    payload: input.payload
  });
}
