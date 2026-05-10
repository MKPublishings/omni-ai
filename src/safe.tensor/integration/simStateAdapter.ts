export interface NormalizedSimState {
  department: string;
  canonLock: boolean;
  requiresCausalConsistency: boolean;
  stage: string;
  entropy: number;
  raw: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function normalizeSimState(simState: unknown): NormalizedSimState {
  const raw = asRecord(simState);

  return {
    department: String(raw.department ?? "general"),
    canonLock: raw.canonLock === true,
    requiresCausalConsistency: raw.requiresCausalConsistency !== false,
    stage: String(raw.stage ?? "unknown"),
    entropy: Number.isFinite(Number(raw.entropy)) ? Number(raw.entropy) : 0,
    raw
  };
}
