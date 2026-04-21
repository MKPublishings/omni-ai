export type SurfaceType = 'grid' | 'flex' | 'stack' | 'float' | 'emergent';
export type ZoneVisibility = 'visible' | 'collapsed' | 'hidden' | 'merged';
export type CollapseBehavior = 'hide' | 'minimize' | 'stack' | 'merge';
export type TransitionSource = 'default' | 'reflow' | 'behavior' | 'telemetry' | 'replay' | 'presence';
export type SpatialRelationPosition = 'above' | 'below' | 'left' | 'right' | 'overlapping';

export interface ViewportContext {
  width: number;
  height: number;
  density: number;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  density: 'compact' | 'comfortable' | 'spacious';
  motionPreference: 'full' | 'reduced' | 'none';
}

export interface GridDefinition {
  columns: string;
  rows: string;
  gap: string;
  areas: string[];
}

export interface ZoneDefinition {
  id: string;
  component: string;
  area?: string | undefined;
  priority?: number | undefined;
  behavior?: string | undefined;
  responsive?: {
    collapse?: CollapseBehavior | undefined;
    threshold?: number | undefined;
    reflow?: boolean | undefined;
  } | undefined;
  constraints?: {
    minWidth?: string | undefined;
    maxWidth?: string | undefined;
    minHeight?: string | undefined;
    aspectRatio?: string | undefined;
  } | undefined;
}

export interface BehaviorBinding {
  id: string;
  trigger: string;
  action: string;
  target?: string | undefined;
  targetGroup?: string | undefined;
  params?: Record<string, unknown> | undefined;
}

export interface TelemetryCondition {
  match?: 'all' | 'any' | undefined;
  layoutMode?: 'grid' | 'stack' | 'float' | undefined;
  minAbsHorizontalBalance?: number | undefined;
  maxAbsHorizontalBalance?: number | undefined;
  minAbsVerticalBalance?: number | undefined;
  maxAbsVerticalBalance?: number | undefined;
  minCollisionCount?: number | undefined;
  maxCollisionCount?: number | undefined;
  collisionSeverity?: 'none' | 'low' | 'medium' | 'high' | undefined;
  minZonePriority?: number | undefined;
  maxZonePriority?: number | undefined;
  relation?: {
    zoneA?: string | undefined;
    zoneB?: string | undefined;
    zoneGroupA?: string | undefined;
    zoneGroupB?: string | undefined;
    relativePosition?: SpatialRelationPosition | undefined;
    overlap?: boolean | undefined;
    minDistance?: number | undefined;
    maxDistance?: number | undefined;
    allowInverse?: boolean | undefined;
  } | undefined;
}

export interface TelemetryMutation {
  target?: string | undefined;
  targetGroup?: string | undefined;
  property: string;
  value: string | number | boolean;
}

export interface TelemetryRule {
  id: string;
  when?: TelemetryCondition | undefined;
  apply: TelemetryMutation[];
  otherwise?: TelemetryMutation[] | undefined;
}

export interface TransitionConfig {
  duration?: string | undefined;
  easing?: string | undefined;
  stagger?: number | undefined;
  yOffset?: number | undefined;
  scaleDelta?: number | undefined;
  blurCollapsed?: string | undefined;
  policies?: Partial<Record<TransitionSource, Omit<TransitionConfig, 'policies'>>> | undefined;
}

export interface StepSchema {
  id: string;
  title: string;
  component: string;
  description?: string | undefined;
}

export interface ReplayRoutingCondition {
  machineState?: string[] | undefined;
  currentStep?: number[] | undefined;
  includesCapabilities?: string[] | undefined;
}

export interface ReplayRoutingRule {
  id: string;
  when?: ReplayRoutingCondition | undefined;
  targetSurface: string;
  availableTargetSurfaces?: string[] | undefined;
}

export interface ReplayRoutingPolicy {
  defaultTargetSurface?: string | undefined;
  availableTargetSurfaces?: string[] | undefined;
  rules?: ReplayRoutingRule[] | undefined;
}

export interface ExportProfile {
  includeSummary?: boolean | undefined;
  includeMutationBatches?: boolean | undefined;
  includeLayoutHashes?: boolean | undefined;
  maxEvents?: number | undefined;
  maxMutationsPerEvent?: number | undefined;
}

export interface SchemaMigrationMetadata {
  family: string;
  revision: number;
  backwardCompatibleWith?: number[] | undefined;
}

export interface LayoutSchema {
  version: string;
  migration?: SchemaMigrationMetadata | undefined;
  surface: {
    id: string;
    type: SurfaceType;
    replayTargetSurface?: string | undefined;
    replayTargetSurfaces?: string[] | undefined;
    replayRouting?: ReplayRoutingPolicy | undefined;
    defaultExportProfile?: string | undefined;
    exportProfiles?: Record<string, ExportProfile> | undefined;
    zoneGroups?: Record<string, string[]> | undefined;
    zones: ZoneDefinition[];
    grid?: GridDefinition | undefined;
  };
  behaviors?: BehaviorBinding[] | undefined;
  telemetry?: {
    rules: TelemetryRule[];
  } | undefined;
  transitions?: TransitionConfig | undefined;
  steps?: StepSchema[] | undefined;
}

export interface ResolvedZone {
  id: string;
  component: string;
  gridArea: string;
  computedWidth: number;
  computedHeight: number;
  visibility: ZoneVisibility;
  mergedInto?: string | undefined;
  priority: number;
  zIndex: number;
  metadata?: Record<string, string | number | boolean> | undefined;
}

export interface ResolvedGrid {
  columns: string;
  rows: string;
  gap: string;
  areas: string[];
  totalWidth: number;
  totalHeight: number;
}

export interface ResolvedLayout {
  id: string;
  grid: ResolvedGrid;
  zones: Record<string, ResolvedZone>;
  metadata: {
    surfaceType: SurfaceType;
    activeBehaviors: string[];
    transitions: TransitionConfig;
  };
}

export interface ReflowTrigger {
  source: string;
  type: 'viewport' | 'interaction' | 'behavior' | 'state-change';
  timestamp: number;
}

export interface CollisionReport {
  zoneA: string;
  zoneB: string;
  overlapArea: number;
}

export type SpatialWeightMap = Record<
  string,
  {
    weight: number;
    priority: number;
  }
>;

export interface ConstraintResult {
  zoneId: string;
  satisfied: boolean;
  notes: string[];
}