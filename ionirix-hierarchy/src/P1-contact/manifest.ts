import { ModuleFeature, ModuleFeatureContext, ModuleManifest } from "../core/types.js";

function contactFeature(id: string, title: string, eventType: string): ModuleFeature {
  return {
    id,
    title,
    eventType,
    async execute(context: ModuleFeatureContext) {
      return {
        featureId: id,
        pointId: "P1",
        artifact: `P1:${id}:${String(context.payload.channel ?? "contact")}`,
        metrics: {
          payloadKeys: Object.keys(context.payload).length,
          rank: 1
        }
      };
    }
  };
}

export const P1ContactManifest: ModuleManifest = {
  pointId: "P1",
  slug: "P1-contact",
  title: "Contact Point",
  constitutionalBasis: ["Article II.8", "Article III.2", "Article IV"],
  templates: ["templates/forms/intake-form.json", "templates/consoles/daily-console.json"],
  allowedSubscriptions: [
    "template.rendered",
    "playbook.generated",
    "campaign.tracked",
    "contact.intake.completed"
  ],
  metadata: {
    owner: "Ionirix",
    version: "1.0.0",
    tags: ["contact", "onboarding", "artifacts"]
  },
  features: [
    contactFeature("onboarding-flow", "Onboarding Flow", "contact.intake.completed"),
    contactFeature("artifact-exporter", "Artifact Exporter", "template.rendered"),
    contactFeature("campaign-asset-generator", "Campaign Asset Generator", "campaign.tracked"),
    contactFeature("unified-intake", "Unified Intake", "playbook.generated")
  ]
};