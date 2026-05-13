import { ModuleFeature, ModuleFeatureContext, ModuleManifest } from "../core/types.js";

function oversightFeature(id: string, title: string, eventType: string): ModuleFeature {
  return {
    id,
    title,
    eventType,
    async execute(context: ModuleFeatureContext) {
      return {
        featureId: id,
        pointId: "P5",
        artifact: `P5:${id}:${String(context.payload.report ?? "oversight")}`,
        metrics: {
          payloadKeys: Object.keys(context.payload).length,
          rank: 5
        }
      };
    }
  };
}

export const P5OversightManifest: ModuleManifest = {
  pointId: "P5",
  slug: "P5-oversight",
  title: "Oversight Point",
  constitutionalBasis: ["Article II.4", "Article III.5", "Article V"],
  templates: ["templates/consoles/daily-console.json"],
  allowedSubscriptions: [
    "mrr.reported",
    "value.flow.mapped",
    "feedback.closed-loop",
    "campaign.tracked"
  ],
  metadata: {
    owner: "Ionirix",
    version: "1.0.0",
    tags: ["oversight", "mrr", "feedback"]
  },
  features: [
    oversightFeature("mrr-dashboard", "MRR Dashboard", "mrr.reported"),
    oversightFeature("value-flow-mapping", "Value Flow Mapping", "value.flow.mapped"),
    oversightFeature("memory-archive", "Memory Archive", "memory.archived"),
    oversightFeature("feedback-loops", "Feedback Loops", "feedback.closed-loop")
  ]
};