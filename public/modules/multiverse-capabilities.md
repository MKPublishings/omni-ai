# Multiverse Capabilities

Multiverse Mode provides deterministic observable-universe-scale simulation capabilities in the Ionirix runtime.

## Core Runtime Surface

- SHA-256 seed cascade and SplitMix64 deterministic PRNG
- Eight-level hierarchy from universe scope to moon-level entities
- Query-first lazy generation with adaptive octree partitioning
- LOD 0-7 output control for bounded computation
- LCDM Planck 2018 baseline cosmology defaults
- Deterministic seed-path reproduction for auditability

## Public Entry Points

- src/modes/multiverse/multiverse_mode.ts
- src/modes/multiverse/multiverse_engine.ts
- src/modes/multiverse/multiverse_schema.ts
- src/modes/multiverse/seed_cascade.ts

## Typical Use Cases

- Deterministic region sampling at selected LOD
- Structural drilldown from cosmic web to planetary satellites
- Repeatable simulation exports for benchmark comparisons
- Bounded large-scale scenario modeling in chat mode
