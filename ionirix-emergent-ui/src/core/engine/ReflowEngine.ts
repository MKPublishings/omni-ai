import type {
  Behavior,
  BehaviorContext,
  CollisionReport,
  ConstraintResult,
  LayoutSchema,
  ReflowTrigger,
  ResolvedLayout,
  SpatialPreferences,
  TelemetryCondition,
  TelemetryMutation,
  CollisionSeverity,
  SpatialWeightMap,
  UserPreferences,
  ViewportContext,
  ZoneDefinition,
} from '@/types';
import { getDefaultSchemaBySurfaceId } from '@/core/schema/defaults';
import { LayoutResolver } from './LayoutResolver';
import { SpatialAnalyzer, type SpatialSnapshot } from './SpatialAnalyzer';

export interface ReflowEngineConfig {
  maxIterations: number;
  debounceMs: number;
  spatialAwareness: boolean;
}

export interface LayoutMutation {
  zoneId: string;
  property: string;
  previousValue: string | number;
  nextValue: string | number;
  targetGroups?: string[];
  reason: ReflowTrigger;
}

export interface ReflowResult {
  layout: ResolvedLayout;
  mutations: LayoutMutation[];
  collisions: CollisionReport[];
  iterationCount: number;
  timestamp: number;
}

const defaultViewport: ViewportContext = {
  width: 1440,
  height: 900,
  density: 1,
};

const defaultPreferences: UserPreferences = {
  theme: 'dark',
  density: 'comfortable',
  motionPreference: 'full',
};

export class ReflowEngine {
  private schema: LayoutSchema | null = null;
  private config: ReflowEngineConfig;
  private currentLayout: ResolvedLayout | null = null;
  private viewport: ViewportContext = defaultViewport;
  private readonly resolver = new LayoutResolver();
  private readonly analyzer = new SpatialAnalyzer();
  private readonly listeners = new Set<() => void>();
  private preferences: UserPreferences = defaultPreferences;
  private interactionHistory: Array<{ event: string; timestamp: number }> = [];
  private focusedZone: string | null = null;
  private currentState = 'idle';
  private lastSpatialSnapshot: SpatialSnapshot | null = null;

  constructor(config: Partial<ReflowEngineConfig> = {}) {
    this.config = {
      maxIterations: config.maxIterations ?? 4,
      debounceMs: config.debounceMs ?? 16,
      spatialAwareness: config.spatialAwareness ?? true,
    };
  }

  initialize(schema: LayoutSchema): void {
    this.schema = schema;
    this.currentLayout = this.resolver.resolve(schema, this.viewport, this.preferences, []);
  }

  requestReflow(trigger: ReflowTrigger): ReflowResult {
    if (!this.schema) {
      throw new Error('ReflowEngine must be initialized with a schema before reflow requests.');
    }

    const layout = this._iterateUntilStable(
      this.resolver.resolve(this.schema, this.viewport, this.preferences, []),
      this.config.maxIterations,
    );
    const snapshot = this.analyzer.capture(layout);
    this.lastSpatialSnapshot = snapshot;
    const collisions = this.config.spatialAwareness ? snapshot.collisions : [];
    const mutations = Object.values(layout.zones).map((zone) => ({
      zoneId: zone.id,
      property: 'visibility',
      previousValue: 'visible',
      nextValue: zone.visibility,
      ...(this.getZoneGroupsForZone(zone.id).length > 0 ? { targetGroups: this.getZoneGroupsForZone(zone.id) } : {}),
      reason: trigger,
    }));

    return {
      layout,
      mutations,
      collisions,
      iterationCount: 1,
      timestamp: Date.now(),
    };
  }

  applyBehaviors(layout: ResolvedLayout, behaviors: Behavior[]): ResolvedLayout {
    if (!this.schema) {
      return layout;
    }

    const nextLayout: ResolvedLayout = {
      ...layout,
      zones: Object.fromEntries(Object.entries(layout.zones).map(([zoneId, zone]) => [zoneId, { ...zone, metadata: { ...(zone.metadata ?? {}) } }])),
    };
    const bindings = this.schema.behaviors ?? [];

    behaviors.forEach((behavior) => {
      const behaviorBindings = bindings.filter((binding) => binding.action === behavior.id);

      behaviorBindings.forEach((binding) => {
        const targets = binding.target === '*'
          ? Object.keys(nextLayout.zones)
          : binding.targetGroup
            ? this.resolveZoneGroupTargets(binding.targetGroup, nextLayout)
            : binding.target
              ? [binding.target]
              : [];

        targets.forEach((zoneId) => {
          const update = behavior.execute(zoneId, binding.params ?? {});
          const zone = nextLayout.zones[zoneId];

          if (!zone) {
            return;
          }

          update.mutations.forEach((mutation) => {
            this.applySurfaceMutation(zone, mutation.property, mutation.value);
          });

          zone.metadata = {
            ...(zone.metadata ?? {}),
            'transition-source': 'behavior',
          };
        });
      });
    });

    return {
      ...nextLayout,
      metadata: {
        ...nextLayout.metadata,
        activeBehaviors: behaviors.map((behavior) => behavior.id),
      },
    };
  }

  commit(layout: ResolvedLayout): void {
    this.currentLayout = layout;
    this.lastSpatialSnapshot = this.analyzer.capture(layout);
    this.listeners.forEach((listener) => listener());
  }

  setViewport(ctx: ViewportContext): void {
    this.viewport = ctx;
  }

  setPreferences(preferences: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
  }

  getCurrentLayout(): ResolvedLayout | null {
    return this.currentLayout;
  }

  getSchema(): LayoutSchema | null {
    return this.schema;
  }

  getSchemaForSurfaceId(surfaceId: string): LayoutSchema | null {
    const candidates = Array.from(new Set([
      surfaceId,
      surfaceId.endsWith('-root') ? surfaceId.slice(0, -5) : `${surfaceId}-root`,
    ])).filter(Boolean);

    if (this.schema && candidates.includes(this.schema.surface.id)) {
      return this.schema;
    }

    return getDefaultSchemaBySurfaceId(surfaceId) ?? null;
  }

  getViewport(): ViewportContext {
    return this.viewport;
  }

  getSpatialSnapshot(): SpatialSnapshot | null {
    return this.lastSpatialSnapshot;
  }

  setFocusedZone(zoneId: string | null): void {
    this.focusedZone = zoneId;
  }

  setCurrentState(state: string): void {
    this.currentState = state;
  }

  recordInteraction(event: string): void {
    this.interactionHistory = [...this.interactionHistory.slice(-49), { event, timestamp: Date.now() }];
  }

  getBehaviorContext(layout = this.currentLayout): BehaviorContext {
    return {
      viewport: { width: this.viewport.width, height: this.viewport.height },
      activeZones: layout ? Object.keys(layout.zones) : [],
      focusedZone: this.focusedZone,
      interactionHistory: this.interactionHistory,
      userPreferences: { ...this.preferences },
      currentState: this.currentState,
    };
  }

  createSpatialCalibration(): SpatialPreferences {
    const snapshot = this.lastSpatialSnapshot ?? (this.currentLayout ? this.analyzer.capture(this.currentLayout) : null);

    if (!snapshot) {
      return {
        layoutMode: 'grid',
        sidebarPosition: 'left',
        zoneCount: 0,
      };
    }

    return snapshot.recommendation;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private _resolveConstraints(zones: ZoneDefinition[], viewport: ViewportContext): ConstraintResult[] {
    return zones.map((zone) => ({
      zoneId: zone.id,
      satisfied: !(zone.constraints?.minWidth && viewport.width < parseInt(zone.constraints.minWidth, 10)),
      notes: [],
    }));
  }

  private _calculateSpatialWeights(zones: ZoneDefinition[]): SpatialWeightMap {
    return this.analyzer.calculateSpatialWeights(zones);
  }

  applyTelemetryMutations(layout: ResolvedLayout): ResolvedLayout {
    return this.applyTelemetryMutationsWithRecommendation(layout);
  }

  applyCalibrationReplay(layout: ResolvedLayout, prefs: SpatialPreferences): ResolvedLayout {
    const replayed = this.applyTelemetryMutationsWithRecommendation(layout, prefs, 'replay');

    return {
      ...replayed,
      metadata: {
        ...replayed.metadata,
        transitions: {
          ...replayed.metadata.transitions,
        },
      },
    };
  }

  private applyTelemetryMutationsWithRecommendation(
    layout: ResolvedLayout,
    overrideRecommendation?: SpatialPreferences,
    source: 'telemetry' | 'replay' = 'telemetry',
  ): ResolvedLayout {
    const snapshot = this.analyzer.capture(layout);
    const recommendation = overrideRecommendation ?? snapshot.recommendation;
    const nextLayout: ResolvedLayout = {
      ...layout,
      zones: Object.fromEntries(
        Object.entries(layout.zones).map(([zoneId, zone]) => [zoneId, { ...zone, metadata: { ...(zone.metadata ?? {}) } }]),
      ),
      metadata: {
        ...layout.metadata,
        transitions: { ...layout.metadata.transitions },
      },
    };

    const telemetryRules = this.schema?.telemetry?.rules ?? [];

    telemetryRules.forEach((rule) => {
      const matches = this.matchesTelemetryCondition(rule.when, recommendation, snapshot, layout);
      const mutations = matches ? rule.apply : (rule.otherwise ?? []);
      this.applyTelemetryRuleMutations(nextLayout, mutations, source);
    });

    return nextLayout;
  }

  private matchesTelemetryCondition(
    condition: TelemetryCondition | undefined,
    recommendation: SpatialPreferences,
    snapshot: SpatialSnapshot,
    layout: ResolvedLayout,
  ): boolean {
    if (!condition) {
      return true;
    }

    const balance = snapshot.balance;
    const collisionCount = snapshot.collisions.length;
    const collisionSeverity = this.getCollisionSeverity(snapshot.collisions);
    const zonePriorities = Object.values(layout.zones).map((zone) => zone.priority);
    const maxZonePriority = zonePriorities.length > 0 ? Math.max(...zonePriorities) : 0;
    const relationMatch = this.matchesRelationCondition(condition.relation, snapshot);

    const checks = [
      condition.layoutMode === undefined ? true : recommendation.layoutMode === condition.layoutMode,
      condition.minAbsHorizontalBalance === undefined ? true : Math.abs(balance.horizontal) >= condition.minAbsHorizontalBalance,
      condition.maxAbsHorizontalBalance === undefined ? true : Math.abs(balance.horizontal) <= condition.maxAbsHorizontalBalance,
      condition.minAbsVerticalBalance === undefined ? true : Math.abs(balance.vertical) >= condition.minAbsVerticalBalance,
      condition.maxAbsVerticalBalance === undefined ? true : Math.abs(balance.vertical) <= condition.maxAbsVerticalBalance,
      condition.minCollisionCount === undefined ? true : collisionCount >= condition.minCollisionCount,
      condition.maxCollisionCount === undefined ? true : collisionCount <= condition.maxCollisionCount,
      condition.collisionSeverity === undefined ? true : collisionSeverity === condition.collisionSeverity,
      condition.minZonePriority === undefined ? true : maxZonePriority >= condition.minZonePriority,
      condition.maxZonePriority === undefined ? true : maxZonePriority <= condition.maxZonePriority,
      condition.relation === undefined ? true : relationMatch,
    ];

    return condition.match === 'any' ? checks.some(Boolean) : checks.every(Boolean);
  }

  private matchesRelationCondition(condition: TelemetryCondition['relation'], snapshot: SpatialSnapshot): boolean {
    if (!condition) {
      return true;
    }

    const inversePositionMap: Record<string, string> = {
      above: 'below',
      below: 'above',
      left: 'right',
      right: 'left',
      overlapping: 'overlapping',
    };
    const zoneGroups = this.schema?.surface.zoneGroups ?? {};

    return snapshot.relations.some((relation) => {
      const directMatch =
        this.matchesZoneSelector(relation.zoneA, condition.zoneA, condition.zoneGroupA, zoneGroups) &&
        this.matchesZoneSelector(relation.zoneB, condition.zoneB, condition.zoneGroupB, zoneGroups);
      const invertedMatch = Boolean(condition.allowInverse) &&
        this.matchesZoneSelector(relation.zoneA, condition.zoneB, condition.zoneGroupB, zoneGroups) &&
        this.matchesZoneSelector(relation.zoneB, condition.zoneA, condition.zoneGroupA, zoneGroups);

      if (!directMatch && !invertedMatch) {
        return false;
      }

      const expectedPosition = invertedMatch && condition.relativePosition
        ? inversePositionMap[condition.relativePosition] ?? condition.relativePosition
        : condition.relativePosition;

      if (expectedPosition !== undefined && relation.relativePosition !== expectedPosition) {
        return false;
      }

      if (condition.overlap !== undefined && relation.overlap !== condition.overlap) {
        return false;
      }

      if (condition.minDistance !== undefined && relation.distance < condition.minDistance) {
        return false;
      }

      if (condition.maxDistance !== undefined && relation.distance > condition.maxDistance) {
        return false;
      }

      return true;
    });
  }

  private matchesZoneSelector(
    candidateZoneId: string,
    explicitZoneId: string | undefined,
    zoneGroupId: string | undefined,
    zoneGroups: Record<string, string[]>,
  ): boolean {
    const explicitMatch = explicitZoneId === undefined ? true : candidateZoneId === explicitZoneId;
    const groupMatch = zoneGroupId === undefined ? true : (zoneGroups[zoneGroupId] ?? []).includes(candidateZoneId);

    return explicitMatch && groupMatch;
  }

  private getZoneGroupsForZone(zoneId: string): string[] {
    const zoneGroups = this.schema?.surface.zoneGroups ?? {};

    return Object.entries(zoneGroups)
      .filter(([, zoneIds]) => zoneIds.includes(zoneId))
      .map(([groupId]) => groupId);
  }

  private resolveZoneGroupTargets(groupId: string, layout: ResolvedLayout): string[] {
    const zoneGroups = this.schema?.surface.zoneGroups ?? {};

    return Array.from(new Set(zoneGroups[groupId] ?? [])).filter((zoneId) => layout.zones[zoneId] !== undefined);
  }

  private applyTelemetryRuleMutations(
    layout: ResolvedLayout,
    mutations: TelemetryMutation[],
    source: 'telemetry' | 'replay',
  ): void {
    mutations.forEach((mutation) => {
      const targets = mutation.target === '*'
        ? Object.values(layout.zones)
        : mutation.targetGroup
          ? this.resolveZoneGroupTargets(mutation.targetGroup, layout)
            .map((zoneId) => layout.zones[zoneId])
            .filter((zone): zone is ResolvedLayout['zones'][string] => zone !== undefined)
          : mutation.target
            ? [layout.zones[mutation.target]].filter((zone): zone is ResolvedLayout['zones'][string] => zone !== undefined)
            : [];

      targets.forEach((zone) => {
        this.applySurfaceMutation(zone, mutation.property, mutation.value);
        zone.metadata = {
          ...(zone.metadata ?? {}),
          'transition-source': source,
          ...(mutation.targetGroup ? { 'target-group': mutation.targetGroup } : {}),
        };
      });
    });
  }

  private getCollisionSeverity(collisions: CollisionReport[]): CollisionSeverity {
    if (collisions.length === 0) {
      return 'none';
    }

    const maxOverlap = Math.max(...collisions.map((collision) => collision.overlapArea));

    if (maxOverlap >= 200000) {
      return 'high';
    }

    if (maxOverlap >= 75000) {
      return 'medium';
    }

    return 'low';
  }

  private _iterateUntilStable(layout: ResolvedLayout, maxIterations: number): ResolvedLayout {
    if (!this.schema) {
      return layout;
    }

    const constraints = this._resolveConstraints(this.schema.surface.zones, this.viewport);
    const weights = this._calculateSpatialWeights(this.schema.surface.zones);
    const constrainedLayout = { ...layout };

    Object.values(constrainedLayout.zones).forEach((zone) => {
      const constraint = constraints.find((item) => item.zoneId === zone.id);
      const weight = weights[zone.id];

      if (constraint?.satisfied === false) {
        zone.visibility = 'collapsed';
      }

      zone.zIndex = Math.min(200, zone.zIndex + Math.round((weight?.weight ?? 0) * maxIterations));
    });

    return constrainedLayout;
  }

  diffLayouts(previous: ResolvedLayout, next: ResolvedLayout): Array<{ zoneId: string; property: string; value: string | number | boolean; targetGroups?: string[] }> {
    return Object.keys(next.zones).flatMap((zoneId) => {
      const previousZone = previous.zones[zoneId];
      const nextZone = next.zones[zoneId];

      if (!previousZone || !nextZone) {
        return [];
      }

      const targetGroups = this.getZoneGroupsForZone(zoneId);
      const withGroups = (mutation: { zoneId: string; property: string; value: string | number | boolean }) => ({
        ...mutation,
        ...(targetGroups.length > 0 ? { targetGroups } : {}),
      });
      const mutations: Array<{ zoneId: string; property: string; value: string | number | boolean; targetGroups?: string[] }> = [];

      if (previousZone.visibility !== nextZone.visibility) {
        mutations.push(withGroups({ zoneId, property: 'visibility', value: nextZone.visibility }));
      }

      if (previousZone.zIndex !== nextZone.zIndex) {
        mutations.push(withGroups({ zoneId, property: 'zIndex', value: nextZone.zIndex }));
      }

      if (previousZone.gridArea !== nextZone.gridArea) {
        mutations.push(withGroups({ zoneId, property: 'gridArea', value: nextZone.gridArea }));
      }

      const previousMetadata = previousZone.metadata ?? {};
      const nextMetadata = nextZone.metadata ?? {};
      const metadataKeys = new Set([...Object.keys(previousMetadata), ...Object.keys(nextMetadata)]);

      metadataKeys.forEach((key) => {
        if (previousMetadata[key] !== nextMetadata[key] && nextMetadata[key] !== undefined) {
          mutations.push(withGroups({ zoneId, property: key, value: nextMetadata[key] }));
        }
      });

      return mutations;
    });
  }

  private applySurfaceMutation(
    zone: ResolvedLayout['zones'][string],
    property: string,
    value: string | number | boolean,
  ): void {
    if (property === 'visibility' && typeof value === 'string') {
      zone.visibility = value as typeof zone.visibility;
      return;
    }

    if (property === 'z-index-delta' && typeof value === 'number') {
      zone.zIndex += value;
      return;
    }

    zone.metadata = {
      ...(zone.metadata ?? {}),
      [property]: value,
    };
  }
}

export const reflowEngine = new ReflowEngine();