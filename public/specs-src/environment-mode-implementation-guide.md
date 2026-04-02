# Ionirix - Environment Mode Implementation Guide

> Mode #12 · Planetary-Scale Environmental Simulation  
> (c) 2026 MK Publishing

---

## File Tree

```text
src/modes/environment/
|-- types/
|   `-- environment.types.ts          # Type system, enums, SeededRandom
|-- core/
|   |-- scale-manager.ts              # 7-level spatial hierarchy
|   |-- environment-engine.ts         # Central orchestrator
|   |-- earth-initializer.ts          # Real-world seed data
|   `-- mode-handler.ts               # NLP command interface
|-- systems/
|   |-- climate-system.ts             # Atmospheric, ENSO, weather
|   |-- hydrology-system.ts           # Water cycle, aquifers, currents
|   |-- ecology-system.ts             # Biomes, food webs, biodiversity
|   |-- geology-system.ts             # Tectonics, seismics, volcanism
|   |-- infrastructure-system.ts      # Roads, grids, ports, telecom
|   |-- population-system.ts          # Demographics, migration, disease
|   |-- energy-system.ts              # Sources, dispatch, markets
|   |-- economy-system.ts             # Solow growth, sectors, trade
|   |-- governance-system.ts          # Gov types, diplomacy, elections
|   `-- transport-system.ts           # Modes, chokepoints, logistics
`-- index.ts                          # Barrel re-export

site-updates/
|-- index-environment-card.html       # Homepage mode card
|-- modes-environment-section.html    # Modes page full section
|-- environment-mode-styles.css       # All Environment Mode CSS
|-- codex-environment-entry.html      # Codex lineage + registry
`-- settings-environment-toggle.html  # Settings panel with controls
```

---

## Installation Steps

### 1. Copy the Module Directory

Place the entire src/modes/environment/ directory into your existing
src/modes/ folder alongside the other mode directories.

### 2. Register the Mode

In your mode registry file (for example, src/modes/index.ts or src/modes/registry.ts),
add the Environment Mode import and registration:

```typescript
import { EnvironmentModeHandler, ENVIRONMENT_MODE_META } from './environment';

// Add to your mode registry array / map:
registry.register(ENVIRONMENT_MODE_META.id, {
  meta: ENVIRONMENT_MODE_META,
  handler: new EnvironmentModeHandler(),
});
```

### 3. Add to the Auto-Router

If you use an auto-router or command dispatcher, register the environment
command prefix:

```typescript
// In your command router:
case 'environment':
case 'env':
case 'planet':
case 'earth':
  return modes.environment.handleCommand(input);
```

### 4. Update Cloudflare Worker Routes

If your Worker uses path-based routing, ensure /modes#environment resolves
correctly. No new Worker route is needed - the hash fragment is client-side.

---

## Site Update Insertion Points

### Homepage (index.html)

Find the modes grid container (for example, <div class="modes-grid">) and insert
index-environment-card.html as a new child. Place it at position #12 or
at the end of the grid.

### Modes Page (modes.html)

Insert modes-environment-section.html as a new <section> after the last
existing mode section. The id="environment" allows direct linking via
/modes#environment.

### Codex Page (codex.html)

Insert codex-environment-entry.html into the lineage/registry section
of the Codex page, maintaining chronological or numerical order.

### Settings Page (settings.html)

Insert settings-environment-toggle.html into the mode settings area.
The toggle controls and JavaScript are self-contained.

### Stylesheet

Link environment-mode-styles.css in your HTML <head> or @import it
into your main stylesheet. It uses CSS custom properties scoped with
--env- prefix to avoid collisions.

```html
<link rel="stylesheet" href="/styles/environment-mode-styles.css" />
```

---

## System Dependency Graph

```text
climate ---------+--> hydrology --> ecology --> population
                 |                                  |
geology ---------+--> infrastructure ---------------|
                 |      |                           |
                 |      +--> energy                 |
                 |      |    |                      |
                 |      +--> transport              |
                 |           |                      |
                 +-----------+--> economy --> governance
```

Execution order (topologically sorted):
1. Climate
2. Geology
3. Hydrology
4. Ecology
5. Infrastructure
6. Population
7. Energy
8. Economy
9. Governance
10. Transport

---

## Scale Resolution Table

| Level | Name           | Cell Size    | Time Step | Example Scope            |
|------|----------------|-------------|----------|--------------------------|
| L0   | Planet         | 100,000 km2 | 720 h    | Global overview          |
| L1   | Continent      | 50,000 km2  | 168 h    | Africa, Asia, Europe     |
| L2   | Country        | 10,000 km2  | 24 h     | USA, Brazil, Germany     |
| L3   | State/Province | 1,000 km2   | 6 h      | New York, Bavaria        |
| L4   | Metro Area     | 100 km2     | 1 h      | NYC Metro, Greater Tokyo |
| L5   | City           | 10 km2      | 0.5 h    | Utica, Munich            |
| L6   | Village        | 1 km2       | 0.25 h   | Small settlement         |

---

## API Usage Examples

### Initialize and Start

```typescript
import { EnvironmentEngine, EarthInitializer } from './modes/environment';

const engine = new EnvironmentEngine({ seed: 42 });

// Register all 10 systems
engine.registerSystem('climate', new ClimateSystem());
engine.registerSystem('geology', new GeologySystem());
engine.registerSystem('hydrology', new HydrologySystem());
engine.registerSystem('ecology', new EcologySystem());
engine.registerSystem('infrastructure', new InfrastructureSystem());
engine.registerSystem('population', new PopulationSystem());
engine.registerSystem('energy', new EnergySystem());
engine.registerSystem('economy', new EconomySystem());
engine.registerSystem('governance', new GovernanceSystem());
engine.registerSystem('transport', new TransportSystem());

// Seed with Earth data
const initializer = new EarthInitializer(engine.scaleManager);
initializer.initialize();

// Run
await engine.initialize();
engine.start();
```

### Execute Ticks

```typescript
// Single tick
const events = engine.executeTick();

// Multiple ticks
const allEvents = engine.executeSteps(100);
```

### Navigate Scales

```typescript
// Zoom into a continent
engine.zoomIn('north-america');

// Zoom back out
engine.zoomOut();
```

### Snapshot and Rollback

```typescript
// Save state
const snapshot = engine.takeSnapshot();

// ... run more ticks ...

// Restore
engine.rollback(snapshot);
```

### Serialize / Deserialize

```typescript
// Export
const state = engine.serializeState();
const json = JSON.stringify(state);

// Import
const restored = JSON.parse(json);
engine.deserializeState(restored);
```

### Event Listeners

```typescript
engine.on('tick', (e) => console.log(`Tick ${e.tick}`));
engine.on('weather', (e) => console.log(`Weather: ${e.type}`));
engine.on('earthquake', (e) => console.log(`Quake M${e.magnitude}`));
```

### Use via Mode Handler (NLP)

```typescript
import { EnvironmentModeHandler } from './modes/environment';

const handler = new EnvironmentModeHandler();

await handler.handleCommand('environment start');
await handler.handleCommand('environment zoom into Europe');
await handler.handleCommand('environment status climate');
await handler.handleCommand('environment speed 100');
await handler.handleCommand('environment snapshot');
await handler.handleCommand('environment stop');
```

---

## Known Conventions to Reconcile

If you encounter TypeScript compile issues, check these three items from
the Parts 1 and 2 delivery:

1. Coordinate fields: environment.types.ts uses lat/lon.
   earth-initializer.ts seed data may use lat/lng. Normalize to
   whichever you chose - find-replace lng -> lon if needed.

2. ScaleLevel enum casing: The enum defines PLANET = 0 (SCREAMING_CASE),
   but mode-handler.ts references ScaleLevel.Planet (PascalCase).
   Ensure the enum values match your chosen convention throughout.

3. GeoRegion.bounds vs .boundingBox: The final types file uses
   boundingBox. Ensure all references in scale-manager.ts and
   earth-initializer.ts match.

---

## Verification

After placing all files, run:

```bash
npx tsc --noEmit
```

Fix any remaining type mismatches using the reconciliation notes above.
Once clean, deploy via your standard Cloudflare Workers pipeline.
