import { TensorAdaptationEngine } from "../core/tensorAdaptation.ts";
import { TensorKernel } from "../core/tensorKernel.ts";
import { TensorRegistry } from "../core/tensorRegistry.ts";
import { createTensorSlice, TensorSliceInput } from "../core/tensorSlice.ts";
import { LineageLogger } from "../metadata/lineageLogger.ts";
import { SimValidator } from "../validation/simValidator.ts";

export const tensorRegistry = new TensorRegistry();
export const tensorValidator = new SimValidator();
export const tensorLineageLogger = new LineageLogger();
export const tensorAdaptation = new TensorAdaptationEngine();
export const tensorKernel = new TensorKernel(tensorRegistry, tensorValidator, tensorLineageLogger, tensorAdaptation);

export function bootstrapSlice(input: TensorSliceInput) {
  return tensorRegistry.register(createTensorSlice(input));
}
