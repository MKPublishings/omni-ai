import { ModuleFeature, ModuleFeatureContext, ModuleManifest } from "../core/types.js";

function directiveFeature(id: string, title: string, eventType: string): ModuleFeature {
  return {
    id,
    title,
    eventType,
    async execute(context: ModuleFeatureContext) {
      return {
        featureId: id,
        pointId: "P4",
        artifact: `P4:${id}:${String(context.payload.directive ?? "strategy")}`,
        metrics: {
          payloadKeys: Object.keys(context.payload).length,
          rank: 4
        }
      };
    }
  };
}

export const P4DirectiveManifest: ModuleManifest = {
  pointId: "P4",
  slug: "P4-directive",
  title: "Directive Point",
  constitutionalBasis: ["Article II.5", "Article III.2", "Article IV"],
  templates: ["templates/strategy/positioning-canvas.json"],
  allowedSubscriptions: [
    "positioning.composed",
    "budget.simulated",
    "playbook.generated",
    "contact.intake.completed"
  ],
  metadata: {
    owner: "Ionirix",
    version: "1.0.0",
    tags: ["directive", "strategy", "roadmap"]
  },
  features: [
    directiveFeature("positioning-engine", "Positioning Engine", "positioning.composed"),
    directiveFeature("budget-simulator", "Budget Simulator", "budget.simulated"),
    directiveFeature("playbook-generator", "Playbook Generator", "playbook.generated"),
    directiveFeature("roadmap-builder", "Roadmap Builder", "roadmap.published")
  ]
};