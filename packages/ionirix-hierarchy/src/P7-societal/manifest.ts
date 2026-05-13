import { ModuleFeature, ModuleFeatureContext, ModuleManifest } from "../core/types.js";

function societalFeature(id: string, title: string, eventType: string): ModuleFeature {
  return {
    id,
    title,
    eventType,
    async execute(context: ModuleFeatureContext) {
      return {
        featureId: id,
        pointId: "P7",
        artifact: `P7:${id}:${String(context.payload.audience ?? "society")}`,
        metrics: {
          payloadKeys: Object.keys(context.payload).length,
          rank: 7
        }
      };
    }
  };
}

export const P7SocietalManifest: ModuleManifest = {
  pointId: "P7",
  slug: "P7-societal",
  title: "Societal Point",
  constitutionalBasis: ["Article II.2", "Article III.2", "Article V"],
  templates: ["templates/forms/intake-form.json", "templates/workflows/workflow-definition.json"],
  allowedSubscriptions: [
    "memory.snapshot.requested",
    "scenario.simulated",
    "knowledge.graph.updated",
    "feedback.ingested"
  ],
  metadata: {
    owner: "Ionirix",
    version: "1.0.0",
    tags: ["societal", "intelligence", "graph"]
  },
  features: [
    societalFeature("persona-modeling", "Persona Modeling", "persona.modeled"),
    societalFeature("scenario-simulation", "Scenario Simulation", "scenario.simulated"),
    societalFeature("knowledge-graph", "Knowledge Graph", "knowledge.graph.updated"),
    societalFeature("intelligence-ingestion", "Intelligence Ingestion", "intelligence.ingested")
  ]
};