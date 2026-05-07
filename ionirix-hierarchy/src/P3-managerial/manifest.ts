import { ModuleFeature, ModuleFeatureContext, ModuleManifest } from "../core/types.js";

function managerialFeature(id: string, title: string, eventType: string): ModuleFeature {
  return {
    id,
    title,
    eventType,
    async execute(context: ModuleFeatureContext) {
      return {
        featureId: id,
        pointId: "P3",
        artifact: `P3:${id}:${String(context.payload.operator ?? "manager")}`,
        metrics: {
          payloadKeys: Object.keys(context.payload).length,
          rank: 3
        }
      };
    }
  };
}

export const P3ManagerialManifest: ModuleManifest = {
  pointId: "P3",
  slug: "P3-managerial",
  title: "Managerial Point",
  constitutionalBasis: ["Article II.6", "Article III.3", "Article IV"],
  templates: ["templates/consoles/daily-console.json"],
  allowedSubscriptions: [
    "console.commanded",
    "ab-test.evaluated",
    "workflow.orchestrated",
    "feedback.ingested"
  ],
  metadata: {
    owner: "Ionirix",
    version: "1.0.0",
    tags: ["managerial", "console", "campaign"]
  },
  features: [
    managerialFeature("command-console", "Command Console", "console.commanded"),
    managerialFeature("campaign-tracker", "Campaign Tracker", "campaign.tracked"),
    managerialFeature("feedback-intake", "Feedback Intake", "feedback.ingested"),
    managerialFeature("ab-test-engine", "A/B Test Engine", "ab-test.evaluated")
  ]
};