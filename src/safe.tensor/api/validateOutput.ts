import { TensorDecisionVerdict } from "../metadata/footprintModel.ts";
import { tensorKernel } from "./index.ts";

export interface ValidateOutputInput {
  requestId: string;
  entityId: string;
  output: unknown;
  simState: Record<string, unknown>;
  simStateRef?: string;
}

export async function validateOutput(input: ValidateOutputInput): Promise<TensorDecisionVerdict> {
  return tensorKernel.validate(input);
}
