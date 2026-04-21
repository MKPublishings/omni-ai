# Architecture

This workspace implements the Emergent-UI onboarding architecture as a runnable VS Code scaffold with three live surfaces: onboarding, dashboard, and editorial.

## Layers

1. Client components render adaptive zones, shell headers, and behavior-driven assist surfaces.
2. The layout engine resolves JSON schemas into concrete grid layouts and records spatial snapshots for each reflow.
3. XState machines manage onboarding flow and UI modes, while hydration restores persisted onboarding state on mount.
4. The behavior registry evaluates adaptive behaviors from typed runtime context and publishes live active-behavior updates.
5. The event bus carries typed cross-layer signals for interaction, state transitions, reflow requests, spatial updates, and behavior triggers.
6. Persistence stores onboarding state locally and keeps the flow resumable across reloads.

## Runtime Flow

1. A shell initializes the schema and viewport in the reflow engine.
2. Reflow produces a resolved layout and a spatial snapshot.
3. The behavior registry evaluates against current state, focus, interaction history, and viewport context.
4. Active behaviors mutate zone metadata and surface visibility through the reflow engine.
5. Adaptive surfaces animate layout and visual changes with Framer Motion layout transitions.
6. Context ribbon actions and the floating assist panel emerge from the active behavior set.
7. Onboarding state is persisted after hydration so the current step and preferences can be restored.

## Spatial Calibration

The spatial preview panel is now an interactive calibration surface rather than a single-click recommendation.

- Dragging the preview zone changes inferred sidebar position.
- Resizing the preview zone changes inferred layout mode and zone density.
- Applying calibration emits a `CALIBRATE` event and commits derived spatial preferences back into onboarding context.

## Workspace Shape

- `src/core` contains the engine, state machines, schema tooling, registries, and event bus.
- `src/components/onboarding` contains the onboarding shell and step renderer.
- `src/components/workspace` contains generic schema shells for dashboard and editorial surfaces.
- `src/components/modules` contains registered module panels used by non-onboarding surfaces.
- `src/components/surfaces` contains adaptive shells including animated surfaces, glass cards, ribbons, and floating panels.
- `src/hooks` exposes reactive machine, reflow, behavior, schema, and spatial subscriptions.
- `src/utils` contains persistence and viewport helpers.
- `schemas` contains JSON Schema definitions.
- `tests` covers engine behavior, registry subscriptions, persistence, and surface rendering.