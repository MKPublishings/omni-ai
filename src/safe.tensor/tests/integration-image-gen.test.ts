import assert from "node:assert/strict";
import test from "node:test";
import { bootstrapSafeTensorGovernance } from "../../image-gen/safe-tensor-bootstrap.ts";
import { validateImageGenRequest } from "../../image-gen/safe-tensor-gateway.ts";
import { routeImageJob } from "../../image-gen/integration/routerHook.ts";
import { evaluateImageRules } from "../../image-gen/integration/imageRuleEngine.ts";
import { normalizeVisualSceneSimState } from "../../image-gen/integration/simStateAdapter.ts";
import type { GenerationRequest } from "../../image-gen/shared/types.ts";
import type { TensorDecisionVerdict } from "../metadata/footprintModel.ts";

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
      checkpoint: "ion-citizen-xl-vpred-v2.0",
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
      checkpoint: "ion-citizen-xl-vpred-v2.0",
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

test("governed image router blocks before generation when intent precheck fails", async () => {
  let generatorCalled = false;
  const result = await routeImageJob(
    {
      requestId: "req-route-block-001",
      entityId: "image_generation",
      prompt: "draw a scene",
      styleHints: ["lofi"],
      simStateRef: "image_generation:user-1",
      generationRequest: {
        requestId: "req-route-block-001",
        userId: "user-1",
        sessionId: "session-1",
        priority: "interactive",
        timestamp: new Date().toISOString(),
        prompt: {
          positive: "draw a scene",
          negative: "",
          qualityTags: [],
          styleTags: [],
        },
        model: {
          checkpoint: "ion-citizen-xl-vpred-v2.0",
          predictionType: "v_prediction",
          vae: "sdxl-vae-fp16-fix",
          loras: [],
          clipSkip: 2,
        },
        parameters: {
          width: 1024,
          height: 1024,
          steps: 20,
          cfgScale: 5,
          cfgRescale: 0.2,
          sampler: "euler",
          scheduler: "normal",
          seed: 7,
          batchSize: 1,
        },
        postProcessing: {
          upscale: {
            enabled: false,
            model: "4x-UltraSharp",
            scale: 2,
          },
          format: "png",
          quality: 95,
          embedMetadata: true,
          generateThumbnail: true,
        },
        ionMetadata: {
          reasoningChain: ["intent_parse", "submit"],
          originalUserPrompt: "draw a scene",
          styleFamily: "lofi_aesthetic",
          inferredMood: "cozy",
          confidence: 0.8,
        },
      },
    },
    {},
    {
      validate: async (): Promise<TensorDecisionVerdict> => ({
        decision: "block",
        reasons: ["intent denied by tensor"],
        violatedRules: ["intent.precheck.blocked"],
        sliceVersion: 1,
      }),
      callGenerator: async () => {
        generatorCalled = true;
        throw new Error("generator should not execute when precheck blocks");
      },
    },
  );

  assert.equal(result.blocked, true);
  assert.deepEqual(result.reasons, ["intent denied by tensor"]);
  assert.equal(generatorCalled, false);
});

test("governed image router returns ratified image reference when checks pass", async () => {
  const validations: string[] = [];
  const result = await routeImageJob(
    {
      requestId: "req-route-allow-001",
      entityId: "image_generation",
      prompt: "draw a calm city street",
      styleHints: ["cinematic"],
      simStateRef: "image_generation:user-2",
      generationRequest: {
        requestId: "req-route-allow-001",
        userId: "user-2",
        sessionId: "session-2",
        priority: "interactive",
        timestamp: new Date().toISOString(),
        prompt: {
          positive: "draw a calm city street",
          negative: "",
          qualityTags: [],
          styleTags: ["cinematic"],
        },
        model: {
          checkpoint: "ion-citizen-xl-vpred-v2.0",
          predictionType: "v_prediction",
          vae: "sdxl-vae-fp16-fix",
          loras: [],
          clipSkip: 2,
        },
        parameters: {
          width: 1216,
          height: 832,
          steps: 28,
          cfgScale: 5,
          cfgRescale: 0.2,
          sampler: "euler",
          scheduler: "normal",
          seed: 42,
          batchSize: 1,
        },
        postProcessing: {
          upscale: {
            enabled: false,
            model: "4x-UltraSharp",
            scale: 2,
          },
          format: "png",
          quality: 95,
          embedMetadata: true,
          generateThumbnail: true,
        },
        ionMetadata: {
          reasoningChain: ["intent_parse", "submit"],
          originalUserPrompt: "draw a calm city street",
          styleFamily: "cinematic_niji",
          inferredMood: "calm",
          confidence: 0.92,
        },
      },
    },
    {},
    {
      validate: async ({ output }): Promise<TensorDecisionVerdict> => {
        validations.push(String((output as { type?: string }).type || "unknown"));
        return {
          decision: "allow",
          reasons: [],
          violatedRules: [],
          sliceVersion: 1,
        };
      },
      callGenerator: async () => ({
        requestId: "req-route-allow-001",
        entityId: "image_generation",
        imageRef: "ion://image/req-route-allow-001/prompt-123",
        latentMetadata: {
          promptId: "prompt-123",
          checkpoint: "ion-citizen-xl-vpred-v2.0",
          seed: 42,
        },
        narrativeTags: ["cinematic_niji", "calm"],
        physicsTags: ["1216x832", "sampler:euler"],
        imageBytes: new Uint8Array([1, 2, 3]),
        promptId: "prompt-123",
        outputModel: "ion-citizen-xl-vpred-v2.0",
        gatewayKind: "mock",
      }),
    },
  );

  assert.equal(result.blocked, false);
  assert.equal(result.imageRef, "ion://image/req-route-allow-001/prompt-123");
  assert.deepEqual(validations, ["intent", "image"]);
});

test("image rule engine flags teleport without transition", () => {
  const evaluation = evaluateImageRules({
    job: {
      requestId: "req-rule-001",
      entityId: "image_generation",
      prompt: "character jumps between panels",
      simStateRef: "image_generation:user-7",
      generationRequest: {
        requestId: "req-rule-001",
        userId: "user-7",
        sessionId: "session-7",
        priority: "interactive",
        timestamp: new Date().toISOString(),
        prompt: {
          positive: "character jumps between panels",
          negative: "",
          qualityTags: [],
          styleTags: [],
        },
        model: {
          checkpoint: "ion-citizen-xl-vpred-v2.0",
          predictionType: "v_prediction",
          vae: "sdxl-vae-fp16-fix",
          loras: [],
          clipSkip: 2,
        },
        parameters: {
          width: 1024,
          height: 1024,
          steps: 20,
          cfgScale: 5,
          cfgRescale: 0.2,
          sampler: "euler",
          scheduler: "normal",
          seed: 7,
          batchSize: 1,
        },
        postProcessing: {
          upscale: {
            enabled: false,
            model: "4x-UltraSharp",
            scale: 2,
          },
          format: "png",
          quality: 95,
          embedMetadata: true,
          generateThumbnail: true,
        },
        ionMetadata: {
          reasoningChain: ["intent_parse", "submit"],
          originalUserPrompt: "character jumps between panels",
          styleFamily: "cinematic_niji",
          inferredMood: "intense",
          confidence: 0.9,
        },
      },
    },
    output: {
      requestId: "req-rule-001",
      entityId: "image_generation",
      imageRef: "ion://image/req-rule-001/prompt-001",
      latentMetadata: {},
      narrativeTags: ["teleport", "panel_shift"],
      physicsTags: ["1024x1024"],
      imageBytes: new Uint8Array([1]),
      promptId: "prompt-001",
      outputModel: "ion-citizen-xl-vpred-v2.0",
      gatewayKind: "mock",
    },
    simState: {
      department: "visual_renders",
      requiresCausalConsistency: true,
    },
  });

  assert.equal(evaluation.timelineIntegrity, false);
  assert.equal(evaluation.causalConsistency, true);
  assert.ok(evaluation.violations.some((violation) => violation.code === "image.timeline.teleport-without-transition"));
});

test("governed router exposes image rule reasons when postcheck blocks", async () => {
  const result = await routeImageJob(
    {
      requestId: "req-route-block-teleport-001",
      entityId: "image_generation",
      prompt: "dynamic multi-panel city chase",
      styleHints: ["cinematic"],
      simStateRef: "image_generation:user-8",
      generationRequest: {
        requestId: "req-route-block-teleport-001",
        userId: "user-8",
        sessionId: "session-8",
        priority: "interactive",
        timestamp: new Date().toISOString(),
        prompt: {
          positive: "dynamic multi-panel city chase",
          negative: "",
          qualityTags: [],
          styleTags: ["cinematic"],
        },
        model: {
          checkpoint: "ion-citizen-xl-vpred-v2.0",
          predictionType: "v_prediction",
          vae: "sdxl-vae-fp16-fix",
          loras: [],
          clipSkip: 2,
        },
        parameters: {
          width: 1216,
          height: 832,
          steps: 28,
          cfgScale: 5,
          cfgRescale: 0.2,
          sampler: "euler",
          scheduler: "normal",
          seed: 42,
          batchSize: 1,
        },
        postProcessing: {
          upscale: {
            enabled: false,
            model: "4x-UltraSharp",
            scale: 2,
          },
          format: "png",
          quality: 95,
          embedMetadata: true,
          generateThumbnail: true,
        },
        ionMetadata: {
          reasoningChain: ["intent_parse", "submit"],
          originalUserPrompt: "dynamic multi-panel city chase",
          styleFamily: "cinematic_niji",
          inferredMood: "intense",
          confidence: 0.94,
        },
      },
    },
    {},
    {
      validate: async ({ output }): Promise<TensorDecisionVerdict> => {
        if ((output as { type?: string }).type === "image") {
          return {
            decision: "block",
            reasons: ["tensor postcheck blocked image output"],
            violatedRules: ["narrative.timeline.break"],
            sliceVersion: 1,
          };
        }

        return {
          decision: "allow",
          reasons: [],
          violatedRules: [],
          sliceVersion: 1,
        };
      },
      callGenerator: async () => ({
        requestId: "req-route-block-teleport-001",
        entityId: "image_generation",
        imageRef: "ion://image/req-route-block-teleport-001/prompt-tele",
        latentMetadata: {
          promptId: "prompt-tele",
          checkpoint: "ion-citizen-xl-vpred-v2.0",
          seed: 42,
        },
        narrativeTags: ["teleport", "panel_shift"],
        physicsTags: ["1216x832"],
        imageBytes: new Uint8Array([1, 2, 3]),
        promptId: "prompt-tele",
        outputModel: "ion-citizen-xl-vpred-v2.0",
        gatewayKind: "mock",
      }),
    },
  );

  assert.equal(result.blocked, true);
  assert.ok(result.reasons.includes("tensor postcheck blocked image output"));
  assert.ok(result.reasons.includes("Character teleport detected without a narrative transition marker."));
});

test("visual scene simState adapter normalizes camera, characters, location, and time of day", () => {
  const normalized = normalizeVisualSceneSimState({
    department: "Brand Assets",
    stage: "render_generation",
    canonLock: true,
    requiresCausalConsistency: true,
    requiredCanonTags: ["crest"],
    scene: {
      camera: "Wide",
      characters: ["Ari", "Milo"],
      location: "Citadel",
      timeOfDay: "Dawn",
    },
  });

  assert.equal(normalized.department, "Brand Assets");
  assert.equal(normalized.scene.camera, "wide");
  assert.deepEqual(normalized.scene.characters, ["ari", "milo"]);
  assert.equal(normalized.scene.location, "citadel");
  assert.equal(normalized.scene.timeOfDay, "dawn");
  assert.deepEqual(normalized.requiredCanonTags, ["crest"]);
});

test("department rule packs enforce stricter scene alignment for brand assets than visual renders", () => {
  const sharedJob = {
    requestId: "req-pack-001",
    entityId: "image_generation",
    prompt: "hero in citadel at dawn",
    simStateRef: "image_generation:user-pack",
    generationRequest: {
      requestId: "req-pack-001",
      userId: "user-pack",
      sessionId: "session-pack",
      priority: "interactive",
      timestamp: new Date().toISOString(),
      prompt: {
        positive: "hero in citadel at dawn",
        negative: "",
        qualityTags: [],
        styleTags: [],
      },
      model: {
        checkpoint: "ion-citizen-xl-vpred-v2.0",
        predictionType: "v_prediction",
        vae: "sdxl-vae-fp16-fix",
        loras: [],
        clipSkip: 2,
      },
      parameters: {
        width: 1024,
        height: 1024,
        steps: 20,
        cfgScale: 5,
        cfgRescale: 0.2,
        sampler: "euler",
        scheduler: "normal",
        seed: 1,
        batchSize: 1,
      },
      postProcessing: {
        upscale: {
          enabled: false,
          model: "4x-UltraSharp",
          scale: 2,
        },
        format: "png",
        quality: 95,
        embedMetadata: true,
        generateThumbnail: true,
      },
      ionMetadata: {
        reasoningChain: ["intent_parse", "submit"],
        originalUserPrompt: "hero in citadel at dawn",
        styleFamily: "cinematic_niji",
        inferredMood: "heroic",
        confidence: 0.9,
      },
    },
  } as const;

  const output = {
    requestId: "req-pack-001",
    entityId: "image_generation",
    imageRef: "ion://image/req-pack-001/prompt-pack",
    latentMetadata: {},
    narrativeTags: ["camera:closeup", "location:market", "time:noon", "character:ari"],
    physicsTags: ["1024x1024"],
    imageBytes: new Uint8Array([1]),
    promptId: "prompt-pack",
    outputModel: "ion-citizen-xl-vpred-v2.0",
    gatewayKind: "mock",
  } as const;

  const brandEvaluation = evaluateImageRules({
    job: sharedJob as any,
    output: output as any,
    simState: {
      department: "brand_assets",
      scene: {
        camera: "wide",
        characters: ["ari", "milo"],
        location: "citadel",
        timeOfDay: "dawn",
      },
    },
  });

  const renderEvaluation = evaluateImageRules({
    job: sharedJob as any,
    output: output as any,
    simState: {
      department: "visual_renders",
      scene: {
        camera: "wide",
        characters: ["ari", "milo"],
        location: "citadel",
        timeOfDay: "dawn",
      },
    },
  });

  assert.equal(brandEvaluation.departmentPackId, "brand-assets-strict");
  assert.equal(renderEvaluation.departmentPackId, "visual-renders-rd");
  assert.ok(brandEvaluation.violations.some((violation) => violation.code === "image.scene.location.mismatch"));
  assert.ok(brandEvaluation.violations.some((violation) => violation.code === "image.scene.character.missing"));
  assert.ok(renderEvaluation.violations.every((violation) => !violation.code.startsWith("image.scene.")));
});

test("rule pack resolution falls back to entityId when department is missing", () => {
  const evaluation = evaluateImageRules({
    job: {
      requestId: "req-pack-fallback-001",
      entityId: "image_generation_brand_assets",
      prompt: "brand key visual",
      simStateRef: "unknown:user-pack-fallback",
      generationRequest: {
        requestId: "req-pack-fallback-001",
        userId: "user-pack-fallback",
        sessionId: "session-pack-fallback",
        priority: "interactive",
        timestamp: new Date().toISOString(),
        prompt: {
          positive: "brand key visual",
          negative: "",
          qualityTags: [],
          styleTags: [],
        },
        model: {
          checkpoint: "ion-citizen-xl-vpred-v2.0",
          predictionType: "v_prediction",
          vae: "sdxl-vae-fp16-fix",
          loras: [],
          clipSkip: 2,
        },
        parameters: {
          width: 1024,
          height: 1024,
          steps: 20,
          cfgScale: 5,
          cfgRescale: 0.2,
          sampler: "euler",
          scheduler: "normal",
          seed: 11,
          batchSize: 1,
        },
        postProcessing: {
          upscale: {
            enabled: false,
            model: "4x-UltraSharp",
            scale: 2,
          },
          format: "png",
          quality: 95,
          embedMetadata: true,
          generateThumbnail: true,
        },
        ionMetadata: {
          reasoningChain: ["intent_parse", "submit"],
          originalUserPrompt: "brand key visual",
          styleFamily: "cinematic_niji",
          inferredMood: "heroic",
          confidence: 0.95,
        },
      },
    },
    output: {
      requestId: "req-pack-fallback-001",
      entityId: "image_generation_brand_assets",
      imageRef: "ion://image/req-pack-fallback-001/prompt-pack-fallback",
      latentMetadata: {},
      narrativeTags: ["camera:closeup", "location:market", "time:noon", "character:ari"],
      physicsTags: ["1024x1024"],
      imageBytes: new Uint8Array([1]),
      promptId: "prompt-pack-fallback",
      outputModel: "ion-citizen-xl-vpred-v2.0",
      gatewayKind: "mock",
    },
    simState: {
      scene: {
        camera: "wide",
        characters: ["ari", "milo"],
        location: "citadel",
        timeOfDay: "dawn",
      },
    },
  });

  assert.equal(evaluation.departmentPackId, "brand-assets-strict");
  assert.ok(evaluation.violations.some((violation) => violation.code === "image.scene.location.mismatch"));
  assert.ok(evaluation.violations.some((violation) => violation.code === "image.scene.character.missing"));
});
