import { bootstrapSlice } from "@/safe.tensor/api/index.ts";

export function bootstrapSafeTensorGovernance() {
  // Initialize image generation governance slice
  bootstrapSlice({
    entityId: "image_generation",
    riskClass: "medium",
    constraints: {
      maxConcurrentJobs: 12,
      allowedModalities: ["image", "video"],
      narrativeStrictness: 0.4,
      physicsStrictness: 0.6,
      escalationPolicyId: "image-generation-default"
    },
    adaptation: {
      enabled: true,
      learningRate: 0.08,
      minStrictness: 0.2,
      maxStrictness: 0.85
    }
  });

  // Initialize video generation governance slice
  bootstrapSlice({
    entityId: "video_generation",
    riskClass: "high",
    constraints: {
      maxConcurrentJobs: 4,
      allowedModalities: ["video"],
      narrativeStrictness: 0.7,
      physicsStrictness: 0.8,
      escalationPolicyId: "video-generation-strict"
    },
    adaptation: {
      enabled: true,
      learningRate: 0.1,
      minStrictness: 0.3,
      maxStrictness: 0.95
    }
  });

  // Initialize upscaling governance slice
  bootstrapSlice({
    entityId: "upscaling",
    riskClass: "low",
    constraints: {
      maxConcurrentJobs: 24,
      allowedModalities: ["image"],
      narrativeStrictness: 0.2,
      physicsStrictness: 0.4,
      escalationPolicyId: "upscaling-permissive"
    },
    adaptation: {
      enabled: true,
      learningRate: 0.05,
      minStrictness: 0.1,
      maxStrictness: 0.7
    }
  });
}
