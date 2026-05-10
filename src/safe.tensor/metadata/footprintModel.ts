export type TensorDecision = "allow" | "block" | "escalate";

export interface TensorDecisionVerdict {
  decision: TensorDecision;
  reasons: string[];
  repairedOutput?: unknown;
  violatedRules: string[];
  sliceVersion: number;
}

export interface TensorDecisionFootprint {
  requestId: string;
  entityId: string;
  timestamp: string;
  decision: TensorDecision;
  reasons: string[];
  violatedRules: string[];
  sliceVersion: number;
  simStateRef?: string;
  payloadHash: string;
}
