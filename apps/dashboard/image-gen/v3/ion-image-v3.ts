// apps/dashboard/image-gen/v3/ion-image-v3.ts

import { buildionWorkflow } from "../app/ion-image-pipeline";
import type {
  IonImageV3Request,
  IonImageV3Result,
  IonImageMetadata,
} from "../../src/lib/generate-ion-image-v3-route-result";

/**
 * Core interface for V3 image generation.
 */
export interface IonImageV3Input {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number | null;
  model?: string;
  metadata?: IonImageMetadata;
}

/**
 * Output returned by the V3 pipeline.
 */
export interface IonImageV3Output {
  imageBase64: string;
  seed: number;
  metadata: IonImageMetadata;
}

/**
 * Main V3 image generation function.
 * This is the only function the orchestrator and route.ts import.
 */
export async function runIonImageV3(
  input: IonImageV3Input
): Promise<IonImageV3Output> {
  const workflow = buildionWorkflow({
    prompt: input.prompt,
    negativePrompt: input.negativePrompt ?? "",
    width: input.width ?? 1024,
    height: input.height ?? 1024,
    steps: input.steps ?? 28,
    seed: input.seed ?? null,
    model: input.model ?? "ion-v3",
    metadata: input.metadata ?? {},
  });

  const result: IonImageV3Result = await workflow.run();

  return {
    imageBase64: result.imageBase64,
    seed: result.seed,
    metadata: result.metadata,
  };
}

export type { IonImageV3Request, IonImageV3Result };
