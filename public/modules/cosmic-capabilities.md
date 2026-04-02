# Cosmic Capabilities

Cosmic Mode provides deterministic Milky Way-scale simulation capabilities in the Ionirix runtime.

## Core Runtime Surface

- Deterministic seeded execution using `Mulberry32` RNG
- Typed schema validation for config and state
- Gravitational architecture with Hernquist, Miyamoto-Nagai, and NFW components
- Galactic rotation and orbital diagnostics (including Toomre-style stability metrics)
- Interstellar medium thermodynamics and phase transitions
- Stellar formation, IMF sampling, evolution, and death events
- Emergent behavior loops (bar, warp, migration, and feedback)
- Snapshot and restore support through serialized state

## Public Entry Points

- `src/modes/cosmic/cosmic_mode.ts`
- `src/modes/cosmic/cosmic_engine.ts`
- `src/modes/cosmic/cosmic_integration.ts`
- `src/modes/cosmic/diagnostics.ts`

## Typical Use Cases

- Deterministic replay of galactic evolution scenarios
- Rotation curve and enclosed-mass diagnostics
- Stellar population stress runs with reproducible seeds
- Runtime explainability through diagnostics report outputs
