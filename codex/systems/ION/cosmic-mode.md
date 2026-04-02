# Cosmic Mode Runtime Contract

## Identity

- Id: system.ION.cosmic-mode
- Layer: systems/ION
- Runtime role: deterministic galactic simulation mode

## Purpose

Cosmic Mode provides a reproducible Milky Way-scale simulation context for Ionirix. It extends Simulation Mode from abstract state transitions into domain-specific astrophysical state evolution.

## Operational Guarantees

- Seeded determinism for replay-safe trajectories
- Typed state/config contracts before engine execution
- Explicit diagnostics output for mass, virial, and event streams
- Stable integration surface through `initializeCosmicMode()`

## Principal Modules

- `src/modes/cosmic/cosmic_schema.ts`
- `src/modes/cosmic/gravitational_architecture.ts`
- `src/modes/cosmic/galactic_dynamics.ts`
- `src/modes/cosmic/interstellar_medium.ts`
- `src/modes/cosmic/stellar_formation.ts`
- `src/modes/cosmic/cosmic_engine.ts`
- `src/modes/cosmic/diagnostics.ts`

## Integration Notes

- Route class: simulation-like mode branch
- Internet policy: no live internet augmentation while in cosmic mode
- Memory policy: follows simulation stateful context behavior
- UI policy: available in mode selectors across Home, Modes, Chat, and Settings
