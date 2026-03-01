# Blackwell Agent Lifecycle (P³BOC v1)

## Core flow

1. Conductor creates ticket and shard set.
2. Engineer resolves infrastructure design shard.
3. Synthesizer merges implementation outputs into a coherent spec.
4. Archivist records durable artifacts and references.
5. Analyst reviews metrics, risk, and optimization recommendations.
6. Conductor either closes the ticket or emits rollout/monitoring shards.

## Canonical contracts

- `TaskShard`
- `Ticket`
- `TicketEvent`
- `HandoffEnvelope`

## Current role matrix

- Engineer → Infra
- Synthesizer → Creative
- Archivist → Ops
- Analyst → Finance
- Conductor (Manager) → Ops / cross-department

## Implementation anchors

- Contracts: `src/mind/contracts/taskShardContracts.ts`
- Role matrix + lifecycle constants: `src/mind/contracts/blackwellRoleMatrix.ts`
- Generator: `src/tools/auto_tokenizer/taskShardGenerator.ts`
- Agent profiles: `config/blackwell-agent-profiles.json`
