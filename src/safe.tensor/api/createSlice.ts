import { createTensorSlice, TensorSliceInput } from "../core/tensorSlice.ts";
import { tensorRegistry } from "./index.ts";

export function createSlice(input: TensorSliceInput) {
  const slice = createTensorSlice(input);
  return tensorRegistry.register(slice);
}
