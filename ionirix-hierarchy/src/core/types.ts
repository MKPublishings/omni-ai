export type PointId = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7" | "P8";

export type Severity = "info" | "warning" | "critical";

export type ExecutionStatus = "pending" | "initialized" | "completed" | "failed";

export interface PointDefinition {
  id: PointId;
  slug: string;
  rank: number;
  features: string[];
}

export interface BusTopology {
  emitters: Record<PointId, string[]>;
  subscribers: Record<PointId, string[]>;
}

export interface HierarchyConfig {
  version: string;
  constitution: string;
  points: PointDefinition[];
  eventTypes: string[];
  busTopology: BusTopology;
}

export interface ModuleFeatureContext {
  featureId: string;
  pointId: PointId;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface ModuleFeatureResult {
  featureId: string;
  pointId: PointId;
  artifact: string;
  metrics: Record<string, number>;
}

export interface ModuleFeature {
  id: string;
  title: string;
  eventType: string;
  execute: (context: ModuleFeatureContext) => Promise<ModuleFeatureResult>;
}

export interface ModuleManifest {
  pointId: PointId;
  slug: string;
  title: string;
  constitutionalBasis: string[];
  features: ModuleFeature[];
  templates: string[];
  allowedSubscriptions: string[];
  metadata: ModuleMetadata;
}

export interface ModuleMetadata {
  owner: string;
  version: string;
  tags: string[];
}

export interface HierarchyEvent {
  type: string;
  sourcePoint: PointId;
  targetPoint?: PointId;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface EventSubscription {
  pointId: PointId;
  eventType: string;
  handlerName: string;
}

export interface ComplianceViolation {
  id: string;
  severity: Severity;
  scope: string;
  message: string;
  remediation: string;
}

export interface ComplianceSummary {
  checksRun: number;
  criticalCount: number;
  warningCount: number;
  passed: boolean;
}

export interface ComplianceReport {
  generatedAt: string;
  summary: ComplianceSummary;
  sections: AuditSection[];
  violations: ComplianceViolation[];
}

export interface AuditSection {
  title: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface ValidationResult {
  violations: ComplianceViolation[];
  summary: ComplianceSummary;
}

export interface LifecycleEvent {
  phase: "pre-register" | "post-register" | "pre-execute" | "post-execute";
  pointId: PointId;
  featureId?: string;
  timestamp: string;
}

export interface LifecycleHook {
  id: string;
  run: (event: LifecycleEvent) => void | Promise<void>;
}

export interface RegistrySnapshot {
  registeredPoints: PointId[];
  manifests: ModuleManifest[];
}

export interface OperatorProfile {
  id: string;
  role: string;
  authorityRank: number;
}

export interface AuditMetrics {
  moduleCount: number;
  featureCount: number;
  eventCount: number;
  subscriptionCount: number;
}

export interface EventMatrixRow {
  pointId: PointId;
  emits: string[];
  subscribes: string[];
}

export interface ConstitutionClause {
  article: string;
  text: string;
}

export interface RuntimeState {
  initialized: boolean;
  lastAudit?: ComplianceReport;
}

export interface EngineExecutionRequest {
  pointId: PointId;
  featureId: string;
  payload: Record<string, unknown>;
}

export interface EngineExecutionResponse {
  event: HierarchyEvent;
  result: ModuleFeatureResult;
}

export interface ScanFinding {
  filePath: string;
  line: number;
  message: string;
}

export interface StaticAnalysisResult {
  findings: ScanFinding[];
}

export interface HierarchyModule {
  manifest: ModuleManifest;
}