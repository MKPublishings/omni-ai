import { validateOutput } from "@/safe.tensor/api/validateOutput.ts";
import { recordDecision } from "@/safe.tensor/api/recordDecision.ts";
import type { GenerationRequest } from "./shared/types.ts";

export interface SafeTensorGatewayInput {
  requestId: string;
  entityId: "image_generation" | "video_generation" | "upscaling";
  request: GenerationRequest;
  simState?: Record<string, unknown>;
}

export interface SafeTensorGatewayOutput {
  allowed: boolean;
  verdict: "allow" | "block" | "escalate";
  reasons: string[];
  repairedRequest?: GenerationRequest;
}

export async function validateImageGenRequest(input: SafeTensorGatewayInput): Promise<SafeTensorGatewayOutput> {
  const verdict = await validateOutput({
    requestId: input.requestId,
    entityId: input.entityId,
    output: input.request,
    simState: input.simState ?? {
      department: "media_generation",
      requiresCausalConsistency: false,
      stage: "pre_execution"
    },
    simStateRef: `${input.entityId}:${input.request.userId}`
  });

  return {
    allowed: verdict.decision === "allow",
    verdict: verdict.decision,
    reasons: verdict.reasons,
    repairedRequest: verdict.repairedOutput ? (verdict.repairedOutput as GenerationRequest) : undefined
  };
}

export async function recordImageGenDecision(input: {
  requestId: string;
  entityId: "image_generation" | "video_generation" | "upscaling";
  verdict: "allow" | "block" | "escalate";
  request: GenerationRequest;
  simStateRef?: string;
}) {
  return recordDecision({
    requestId: input.requestId,
    entityId: input.entityId,
    verdict: {
      decision: input.verdict,
      reasons: [],
      violatedRules: [],
      sliceVersion: 1
    },
    simStateRef: input.simStateRef,
    payload: input.request
  });
}
