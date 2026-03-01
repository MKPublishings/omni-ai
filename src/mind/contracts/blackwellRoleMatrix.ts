import type { AgentRoleMatrixEntry, LifecycleStep } from "./taskShardContracts";

export const BLACKWELL_ROLE_MATRIX: AgentRoleMatrixEntry[] = [
  {
    role: "Engineer",
    primaryDepartment: "Infra",
    archetype: "Forge / Architect",
    purpose: "Turns intent into implementable systems, contracts, and migration paths.",
    defaultHandoffTargets: ["Synthesizer", "Archivist"]
  },
  {
    role: "Synthesizer",
    primaryDepartment: "Creative",
    archetype: "Alchemist / Editor",
    purpose: "Merges technical and operational signals into coherent outputs.",
    defaultHandoffTargets: ["Archivist", "Manager"]
  },
  {
    role: "Archivist",
    primaryDepartment: "Ops",
    archetype: "Scribe / Vault Keeper",
    purpose: "Codifies durable knowledge, benchmarks, and reusable artifacts.",
    defaultHandoffTargets: ["Analyst"]
  },
  {
    role: "Analyst",
    primaryDepartment: "Finance",
    archetype: "Quant / Cartographer",
    purpose: "Measures outcomes, flags risk, and proposes optimization moves.",
    defaultHandoffTargets: ["Engineer", "Manager"]
  },
  {
    role: "Manager",
    primaryDepartment: "Ops",
    archetype: "Conductor / Council Chair",
    purpose: "Routes shards, monitors decay windows, and closes ticket loops.",
    defaultHandoffTargets: ["Engineer", "Synthesizer", "Archivist", "Analyst"]
  }
];

export const BLACKWELL_VIDEO_PIPELINE_LIFECYCLE: LifecycleStep[] = [
  {
    step: 1,
    stage: "Ticket created",
    actor: "agent.conductor.blackwell",
    output: "TaskShard"
  },
  {
    step: 2,
    stage: "Engineering design",
    actor: "agent.engineer.blackwell",
    output: "HandoffEnvelope"
  },
  {
    step: 3,
    stage: "Synthesis",
    actor: "agent.synthesizer.blackwell",
    output: "HandoffEnvelope"
  },
  {
    step: 4,
    stage: "Inscription",
    actor: "agent.archivist.blackwell",
    output: "TicketEvent"
  },
  {
    step: 5,
    stage: "Metrics and risk review",
    actor: "agent.analyst.blackwell",
    output: "HandoffEnvelope"
  },
  {
    step: 6,
    stage: "Conductor closure",
    actor: "agent.conductor.blackwell",
    output: "TicketEvent"
  }
];
