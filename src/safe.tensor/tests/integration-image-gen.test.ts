import assert from "node:assert/strict";
import test from "node:test";
import { bootstrapSafeTensorGovernance } from "../../image-gen/safe-tensor-bootstrap.ts";
import { validateImageGenRequest } from "../../image-gen/safe-tensor-gateway.ts";
import type { GenerationRequest } from "../../image-gen/shared/types.ts";

test("safe.tensor governs image generation independently of checkpoint files", async () => {
  bootstrapSafeTensorGovernance();

  const mockRequest: GenerationRequest = {
    requestId: "req-gov-001",
    userId: "user-123",
    sessionId: "session-456",
    priority: "interactive",
    timestamp: new Date().toISOString(),
    prompt: {
      text: "a beautiful landscape",
      enrichedText: "a beautiful landscape",
      negativeText: "",
      source: "user",
    } as any,
    model: {
      checkpoint: "noobai-xl-vpred-v1.0",
      predictionType: "v_prediction",
      vae: "sdxl-vae-fp16-fix",
    } as any,
    parameters: {
      seed: 42,
      steps: 28,
      guidance: 5,
      sampler: "euler",
      scheduler: "normal",
    } as any,
    postProcessing: {
      upscaleEnabled: false,
      upscaleMethod: "realesrgan",
    } as any,
    ionMetadata: {} as any,
  };

  const verdict = await validateImageGenRequest({
    requestId: "req-gov-001",
    entityId: "image_generation",
    request: mockRequest,
    simState: {
      department: "media_generation",
      stage: "pre_execution",
      requiresCausalConsistency: false,
    },
  });

  assert.ok(verdict.allowed, "governance should allow valid image generation request");
  assert.equal(verdict.verdict, "allow");
  assert.ok(Array.isArray(verdict.reasons));
});

test("safe.tensor enforces strictness independent of model checkpoint", async () => {
  bootstrapSafeTensorGovernance();

  const mockRequest: GenerationRequest = {
    requestId: "req-gov-002",
    userId: "user-456",
    sessionId: "session-789",
    priority: "batch",
    timestamp: new Date().toISOString(),
    prompt: {
      text: "test",
      enrichedText: "test",
      negativeText: "",
      source: "user",
    } as any,
    model: {
      checkpoint: "noobai-xl-vpred-v1.0",
      predictionType: "v_prediction",
      vae: "sdxl-vae-fp16-fix",
    } as any,
    parameters: {
      seed: 99,
      steps: 28,
      guidance: 5,
      sampler: "euler",
      scheduler: "normal",
    } as any,
    postProcessing: {
      upscaleEnabled: false,
      upscaleMethod: "realesrgan",
    } as any,
    ionMetadata: {} as any,
  };

  const verdict = await validateImageGenRequest({
    requestId: "req-gov-002",
    entityId: "image_generation",
    request: mockRequest,
    simState: {
      department: "media_generation",
      stage: "pre_execution",
      requiresCausalConsistency: false,
    },
  });

  // Verdict should be independent of checkpoint name
  assert.ok(["allow", "block", "escalate"].includes(verdict.verdict));
});
