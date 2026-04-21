# Schema Reference

## layout.schema.json

Defines surface metadata, zones, optional grid definitions, behavior bindings, transitions, telemetry rules, replay routing policies, and onboarding steps.

Top-level fields:
- `version` identifies the schema document version.
- `migration` declares schema family and revision metadata so exported diff artifacts can be compared for compatibility.

Key surface fields:
- `replayTargetSurface` and `replayTargetSurfaces` provide simple static replay targets.
- `replayRouting` adds rule-based replay routing with `machineState`, `currentStep`, and `includesCapabilities` conditions. Replay consumers should resolve these rules from the live source-surface schema rather than persisting the policy into history entries.
- `defaultExportProfile` and `exportProfiles` define schema-backed diff export shapes for inspector tooling.
- `zoneGroups` maps semantic cluster ids to concrete zone ids so telemetry relations can target grouped aliases.

Key behavior fields:
- `behaviors[].targetGroup` lets behavior bindings address semantic clusters directly instead of duplicating zone-specific bindings.

Key telemetry fields:
- `telemetry.rules[].when.relation.zoneGroupA` and `zoneGroupB` let schemas match relations against grouped zones.
- `telemetry.rules[].when.relation.allowInverse` lets schemas match the same relation when zone order is reversed.
- `telemetry.rules[].apply[].targetGroup` and `otherwise[].targetGroup` let schemas mutate semantic clusters directly.

Inspector exports:
- Export payloads include a top-level `schemaVersion` and per-event `schemaVersion` tags so diff artifacts remain comparable across schema revisions.
- Export payloads also include `schemaMigration` metadata so downstream tooling can decide whether artifacts are directly comparable or require normalization.

Replay diagnostics:
- Replay-driven layout changes may include diagnostics such as the matched replay-routing rule id, resolution source, and source-surface schema metadata.

Migration compatibility and normalization:
- Inspector rows compute a compatibility status against the active surface migration baseline: direct, normalize, incompatible, or unknown.
- Inspector filters can isolate events by compatibility status so replay drift and export risk can be triaged without mixing direct and normalized artifacts.
- Inspector summaries now report compatibility counts for the active window and per surface so schema drift is measurable without opening individual event rows.
- Inspector baseline revision controls can swap the comparison/export baseline between the live schema and revision fixtures, making cross-revision analysis explicit instead of implicit.
- The selected inspector baseline revision now persists per surface, so revision comparisons survive navigation and refresh instead of resetting to the live baseline.
- The inspector also persists source, compatibility, and time-window filters per surface, so moving between dashboard, onboarding, and editorial restores each surface's review posture instead of collapsing back to global defaults.
- The focused baseline surface and any active zone drill-down now persist per surface as well, so a matrix drill-down can be resumed without manually rebuilding the same filter path.
- Property-level drill-down now persists with the rest of the inspector view state, so a zone-focused property investigation can be restored exactly where it was left.
- The inspector now exposes a single reset control that clears the full persisted review posture for the current surface, including baseline, filters, and focused surface, zone, and property drill-downs.
- When a fixture baseline is selected, the inspector renders a live-versus-fixture schema diff summary covering version, zone, behavior, telemetry, and replay-target deltas.
- The inspector also exposes a surface baseline matrix for the active revision so dashboard, onboarding, and editorial fixtures can be compared in one pass, plus a reset control to clear the stored baseline selection for the current surface.
- Surface baseline matrix cards can now drill the inspector into a single surface, exposing added and removed zones plus replay-target changes directly in the inspector instead of requiring JSON export inspection.
- Added and removed zone entries are now actionable drill-down controls: selecting a changed zone filters the visible mutation list to that zone until the operator clears zone focus.
- Once a zone is focused, mutation properties become actionable drill-down controls too, allowing the inspector to collapse to a single remapped or replayed property without leaving the event list.
- Export payloads include a `normalization` block with canonicalized event mutations and compatibility metadata so cross-revision comparisons can be automated instead of rebuilt by downstream tooling.
- Normalized export events also include a `normalizationStrategy` field so revision-specific transforms are explicit instead of inferred.
- Replay history actions surface normalization warnings in the action label when a stored calibration targets a schema revision that is not directly comparable.
- Replay modules expose a normalized replay preview before commit so operators can inspect the compatibility result and normalization strategy without emitting a replay event.
- Preview panels can now promote the inspected replay directly into an applied replay event, so the operator can commit the exact previewed artifact without recomputing it.
- Replay preview payloads now persist per target surface and replay origin, allowing an operator to resume a previously inspected replay preview before choosing whether to apply it.
- Replay modules now expose explicit clear actions so persisted replay previews can be discarded without replaying them.
- Replay preview persistence now also carries comparison posture for each target surface and origin, including the active compact-versus-full artifact profile, the current semantic badge filter, and any staged candidate preview payload.
- When a newly generated replay preview differs from the stored preview, replay modules now enter a comparison mode that shows stored and candidate payloads side by side before replacement.
- Comparison mode now includes a semantic summary layer for target, compatibility, replay route, normalization strategy, and remapped property deltas, so operators can judge preview changes before reading raw JSON.
- Replay preview JSON artifacts now include a top-level `semanticSummary`, and the comparison UI surfaces the same information as compact badges for target, compatibility, route, normalization, and remap changes.
- Those semantic badges are now interactive filters, so the comparison panel can collapse to just target drift, compatibility drift, routing drift, normalization drift, or remap deltas.
- Replay comparison also exposes a non-destructive reset control that clears staged candidate payloads and semantic filter posture while keeping the accepted preview artifact intact.
- Replay preview generation now supports explicit `compact` and `full` artifact profiles, making it possible to inspect or persist a semantic-first preview without always carrying the full normalization payload.
- Replay comparison now opens with a drift summary row that quantifies changed semantic signals, remap delta count, and overall severity before the operator reads the side-by-side JSON payloads.
- The drift summary cards now drive the same semantic filter state as the compact badges, so target, compatibility, route, normalization, and remap drift can be isolated directly from the summary row.
- Replay preview panels also expose explicit copy actions for the active preview, stored preview, and candidate preview artifacts so compact and full payloads can be exported directly from the UI.
- Copied replay preview artifacts now include a manifest header describing profile, source and target surfaces, origin, schema version and revision, compatibility posture, normalization strategy, drift severity, and export timestamp.

Revision fixtures:
- `getSchemaRevisionFixture(surfaceId, revision)` exposes revisioned schema fixtures for onboarding, dashboard, and editorial surfaces so tests and tooling can exercise migration paths beyond the live default revision.
- Revision-specific normalization hooks now cover dashboard, onboarding, and editorial mutation remapping paths, not just generic schema metadata comparison.
- Normalized export mutations now include both `original` and `normalized` snapshots, so downstream tooling can compare remapped fields side by side without reconstructing the pre-normalized artifact.
- The layout inspector now renders those `original` versus `normalized` mutation snapshots inline for the current filtered events, which makes normalization review possible before exporting JSON.

## onboarding.schema.json

Provides the five-step onboarding surface, adaptive zones, default behavior bindings, and schema-defined replay routing policies for calibration history.

## behavior.schema.json

Defines the minimal structure required for behavior metadata registration.