# Behavior Catalog

## AdaptiveReveal

- Trigger: `INTERACTION`
- Priority: `80`
- Purpose: reveal additional content after sustained focus on a zone.
- Surface effect: promotes contextual actions in the ribbon and enables the floating assist panel when sustained engagement is detected.

## SpatialCollapse

- Trigger: `VIEWPORT_RESIZE`
- Priority: `90`
- Purpose: collapse lower-priority zones when the viewport cannot comfortably support the active zone count.
- Surface effect: dims and compresses lower-priority surfaces while preserving the current focus zone.

## ContextualElevation

- Trigger: `INTERACTION`
- Priority: `70`
- Purpose: visually elevate the currently focused zone.
- Surface effect: increases z-index and allows AdaptiveSurface to animate emphasis during layout changes.

## ProgressiveDisclosure

- Trigger: `STATE_TRANSITION`
- Priority: `60`
- Purpose: reveal advanced interface layers as interaction variety increases.
- Surface effect: drives the assist panel and exposes richer contextual actions once the user demonstrates enough interaction depth.

## Runtime Notes

- Active behaviors are now published through registry subscriptions, allowing hooks and surfaces to react without manual polling.
- Behavior activation depends on the reflow engine's live behavior context: viewport, active zones, focus, interaction history, user preferences, and current machine state.
- The onboarding surface consumes the active behavior set directly to render emergent ribbon actions and floating guidance.