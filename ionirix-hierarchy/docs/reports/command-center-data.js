window.__IONIRIX_HIERARCHY__ = {
  "generatedAt": "2026-05-07T00:25:04.751Z",
  "summary": {
    "points": 8,
    "features": 32,
    "events": 28,
    "subscriptions": 32,
    "criticalViolations": 0
  },
  "points": [
    {
      "pointId": "P8",
      "slug": "P8-sovereign",
      "title": "Sovereign Point",
      "features": [
        {
          "id": "workspace-creation",
          "title": "Workspace Creation",
          "eventType": "workspace.created"
        },
        {
          "id": "memory-engine",
          "title": "Memory Engine",
          "eventType": "memory.snapshot.requested"
        },
        {
          "id": "reasoning-modes",
          "title": "Reasoning Modes",
          "eventType": "reasoning.mode.changed"
        },
        {
          "id": "data-ownership",
          "title": "Data Ownership",
          "eventType": "ownership.asserted"
        }
      ],
      "subscriptions": [
        "workspace.created",
        "ownership.asserted",
        "compliance.checked",
        "memory.archived"
      ],
      "tags": [
        "sovereign",
        "runtime",
        "memory"
      ],
      "templates": [
        "templates/workflows/workflow-definition.json",
        "templates/compliance/compliance-checklist.json"
      ]
    },
    {
      "pointId": "P7",
      "slug": "P7-societal",
      "title": "Societal Point",
      "features": [
        {
          "id": "persona-modeling",
          "title": "Persona Modeling",
          "eventType": "persona.modeled"
        },
        {
          "id": "scenario-simulation",
          "title": "Scenario Simulation",
          "eventType": "scenario.simulated"
        },
        {
          "id": "knowledge-graph",
          "title": "Knowledge Graph",
          "eventType": "knowledge.graph.updated"
        },
        {
          "id": "intelligence-ingestion",
          "title": "Intelligence Ingestion",
          "eventType": "intelligence.ingested"
        }
      ],
      "subscriptions": [
        "memory.snapshot.requested",
        "scenario.simulated",
        "knowledge.graph.updated",
        "feedback.ingested"
      ],
      "tags": [
        "societal",
        "intelligence",
        "graph"
      ],
      "templates": [
        "templates/forms/intake-form.json",
        "templates/workflows/workflow-definition.json"
      ]
    },
    {
      "pointId": "P6",
      "slug": "P6-legality",
      "title": "Legality Point",
      "features": [
        {
          "id": "contract-generator",
          "title": "Contract Generator",
          "eventType": "contract.generated"
        },
        {
          "id": "compliance-engine",
          "title": "Compliance Engine",
          "eventType": "compliance.checked"
        },
        {
          "id": "ip-protection",
          "title": "IP Protection",
          "eventType": "ip.protected"
        },
        {
          "id": "data-sovereignty-controls",
          "title": "Data Sovereignty Controls",
          "eventType": "sovereignty.guard.applied"
        }
      ],
      "subscriptions": [
        "contract.generated",
        "ip.protected",
        "ownership.asserted",
        "template.rendered"
      ],
      "tags": [
        "legal",
        "compliance",
        "ip"
      ],
      "templates": [
        "templates/compliance/compliance-checklist.json"
      ]
    },
    {
      "pointId": "P5",
      "slug": "P5-oversight",
      "title": "Oversight Point",
      "features": [
        {
          "id": "mrr-dashboard",
          "title": "MRR Dashboard",
          "eventType": "mrr.reported"
        },
        {
          "id": "value-flow-mapping",
          "title": "Value Flow Mapping",
          "eventType": "value.flow.mapped"
        },
        {
          "id": "memory-archive",
          "title": "Memory Archive",
          "eventType": "memory.archived"
        },
        {
          "id": "feedback-loops",
          "title": "Feedback Loops",
          "eventType": "feedback.closed-loop"
        }
      ],
      "subscriptions": [
        "mrr.reported",
        "value.flow.mapped",
        "feedback.closed-loop",
        "campaign.tracked"
      ],
      "tags": [
        "oversight",
        "mrr",
        "feedback"
      ],
      "templates": [
        "templates/consoles/daily-console.json"
      ]
    },
    {
      "pointId": "P4",
      "slug": "P4-directive",
      "title": "Directive Point",
      "features": [
        {
          "id": "positioning-engine",
          "title": "Positioning Engine",
          "eventType": "positioning.composed"
        },
        {
          "id": "budget-simulator",
          "title": "Budget Simulator",
          "eventType": "budget.simulated"
        },
        {
          "id": "playbook-generator",
          "title": "Playbook Generator",
          "eventType": "playbook.generated"
        },
        {
          "id": "roadmap-builder",
          "title": "Roadmap Builder",
          "eventType": "roadmap.published"
        }
      ],
      "subscriptions": [
        "positioning.composed",
        "budget.simulated",
        "playbook.generated",
        "contact.intake.completed"
      ],
      "tags": [
        "directive",
        "strategy",
        "roadmap"
      ],
      "templates": [
        "templates/strategy/positioning-canvas.json"
      ]
    },
    {
      "pointId": "P3",
      "slug": "P3-managerial",
      "title": "Managerial Point",
      "features": [
        {
          "id": "command-console",
          "title": "Command Console",
          "eventType": "console.commanded"
        },
        {
          "id": "campaign-tracker",
          "title": "Campaign Tracker",
          "eventType": "campaign.tracked"
        },
        {
          "id": "feedback-intake",
          "title": "Feedback Intake",
          "eventType": "feedback.ingested"
        },
        {
          "id": "ab-test-engine",
          "title": "A/B Test Engine",
          "eventType": "ab-test.evaluated"
        }
      ],
      "subscriptions": [
        "console.commanded",
        "ab-test.evaluated",
        "workflow.orchestrated",
        "feedback.ingested"
      ],
      "tags": [
        "managerial",
        "console",
        "campaign"
      ],
      "templates": [
        "templates/consoles/daily-console.json"
      ]
    },
    {
      "pointId": "P2",
      "slug": "P2-operational",
      "title": "Operational Point",
      "features": [
        {
          "id": "workflow-orchestration",
          "title": "Workflow Orchestration",
          "eventType": "workflow.orchestrated"
        },
        {
          "id": "template-library",
          "title": "Template Library",
          "eventType": "template.rendered"
        },
        {
          "id": "simulation-pipeline",
          "title": "Simulation Pipeline",
          "eventType": "simulation.pipeline.ran"
        },
        {
          "id": "customer-success-rituals",
          "title": "Customer Success Rituals",
          "eventType": "feedback.closed-loop"
        }
      ],
      "subscriptions": [
        "workflow.orchestrated",
        "template.rendered",
        "scenario.simulated",
        "contact.intake.completed"
      ],
      "tags": [
        "operational",
        "workflow",
        "simulation"
      ],
      "templates": [
        "templates/workflows/workflow-definition.json",
        "templates/forms/intake-form.json"
      ]
    },
    {
      "pointId": "P1",
      "slug": "P1-contact",
      "title": "Contact Point",
      "features": [
        {
          "id": "onboarding-flow",
          "title": "Onboarding Flow",
          "eventType": "contact.intake.completed"
        },
        {
          "id": "artifact-exporter",
          "title": "Artifact Exporter",
          "eventType": "template.rendered"
        },
        {
          "id": "campaign-asset-generator",
          "title": "Campaign Asset Generator",
          "eventType": "campaign.tracked"
        },
        {
          "id": "unified-intake",
          "title": "Unified Intake",
          "eventType": "playbook.generated"
        }
      ],
      "subscriptions": [
        "template.rendered",
        "playbook.generated",
        "campaign.tracked",
        "contact.intake.completed"
      ],
      "tags": [
        "contact",
        "onboarding",
        "artifacts"
      ],
      "templates": [
        "templates/forms/intake-form.json",
        "templates/consoles/daily-console.json"
      ]
    }
  ],
  "auditSections": [
    {
      "title": "Constitution",
      "status": "pass",
      "detail": "32 constitutional lines loaded."
    },
    {
      "title": "Hierarchy Config",
      "status": "pass",
      "detail": "8 points, 28 event types."
    },
    {
      "title": "Modules",
      "status": "pass",
      "detail": "8 modules and 32 feature handlers registered."
    },
    {
      "title": "Metrics",
      "status": "pass",
      "detail": "28 authorized events and 32 subscriptions tracked."
    },
    {
      "title": "Event Bus Topology",
      "status": "pass",
      "detail": "All registered points comply with authorized emitter/subscriber topology."
    }
  ],
  "busTopology": {
    "emitters": {
      "P8": [
        "workspace.created",
        "memory.snapshot.requested",
        "reasoning.mode.changed",
        "ownership.asserted"
      ],
      "P7": [
        "persona.modeled",
        "scenario.simulated",
        "knowledge.graph.updated",
        "intelligence.ingested"
      ],
      "P6": [
        "contract.generated",
        "compliance.checked",
        "ip.protected",
        "sovereignty.guard.applied"
      ],
      "P5": [
        "mrr.reported",
        "value.flow.mapped",
        "memory.archived",
        "feedback.closed-loop"
      ],
      "P4": [
        "positioning.composed",
        "budget.simulated",
        "playbook.generated",
        "roadmap.published"
      ],
      "P3": [
        "console.commanded",
        "campaign.tracked",
        "feedback.ingested",
        "ab-test.evaluated"
      ],
      "P2": [
        "workflow.orchestrated",
        "template.rendered",
        "simulation.pipeline.ran",
        "feedback.closed-loop"
      ],
      "P1": [
        "contact.intake.completed",
        "template.rendered",
        "campaign.tracked",
        "playbook.generated"
      ]
    },
    "subscribers": {
      "P8": [
        "workspace.created",
        "ownership.asserted",
        "compliance.checked",
        "memory.archived"
      ],
      "P7": [
        "memory.snapshot.requested",
        "scenario.simulated",
        "knowledge.graph.updated",
        "feedback.ingested"
      ],
      "P6": [
        "contract.generated",
        "ip.protected",
        "ownership.asserted",
        "template.rendered"
      ],
      "P5": [
        "mrr.reported",
        "value.flow.mapped",
        "feedback.closed-loop",
        "campaign.tracked"
      ],
      "P4": [
        "positioning.composed",
        "budget.simulated",
        "playbook.generated",
        "contact.intake.completed"
      ],
      "P3": [
        "console.commanded",
        "ab-test.evaluated",
        "workflow.orchestrated",
        "feedback.ingested"
      ],
      "P2": [
        "workflow.orchestrated",
        "template.rendered",
        "scenario.simulated",
        "contact.intake.completed"
      ],
      "P1": [
        "template.rendered",
        "playbook.generated",
        "campaign.tracked",
        "contact.intake.completed"
      ]
    }
  }
};
