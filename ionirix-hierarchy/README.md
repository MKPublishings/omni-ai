# Ionirix Eight-Point Hierarchy

Sovereign workspace enforcing the Ionirix constitutional hierarchy in code.

## Commands

- `npm install`
- `npm run dev`
- `npm run validate`
- `npm run audit`
- `npm run typecheck`
- `npm run test`

## Layout

- `src/core`: engine, registry, and static validation
- `src/integrations`: event bus, lifecycle hooks, and compliance validator
- `src/P1-contact` through `src/P8-sovereign`: immutable point manifests and active handlers
- `templates`: operational JSON scaffolds
- `scripts`: validation and audit entrypoints
- `tests`: runtime and validation checks