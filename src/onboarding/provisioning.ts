type ProvisioningStatus = 'pending-verification' | 'active';

type WorkspaceModulePayload = {
  id: string;
  label: string;
  route: string;
  priority: number;
  enabled: boolean;
};

type WorkspaceFormationPayload = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  primaryRoute: string;
  capabilityScore: number;
  shell: Record<string, unknown>;
  modules: WorkspaceModulePayload[];
  orchestration: Record<string, unknown>;
  summary: string[];
};

type WorkspaceContextPayload = {
  workspace?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
};

export interface ProvisionWorkspaceInput {
  formation: WorkspaceFormationPayload;
  context: WorkspaceContextPayload;
  source?: string;
}

interface OnboardingWorkspaceRow {
  id: string;
  user_id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  primary_route: string;
  capability_score: number;
  provisioning_status: ProvisioningStatus;
  source: string;
  shell_json: string;
  modules_json: string;
  orchestration_json: string;
  summary_json: string;
  context_json: string;
  created_at: string;
  updated_at: string;
}

export interface ProvisionedWorkspaceRecord {
  id: string;
  userId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  primaryRoute: string;
  capabilityScore: number;
  provisioningStatus: ProvisioningStatus;
  source: string;
  shell: Record<string, unknown>;
  modules: WorkspaceModulePayload[];
  orchestration: Record<string, unknown>;
  summary: string[];
  context: WorkspaceContextPayload;
  createdAt: string;
  updatedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function safeJsonParse<T>(value: string): T {
  return JSON.parse(value) as T;
}

function mapProvisionedWorkspace(row: OnboardingWorkspaceRow): ProvisionedWorkspaceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    workspaceSlug: row.workspace_slug,
    primaryRoute: row.primary_route,
    capabilityScore: Number(row.capability_score || 0),
    provisioningStatus: row.provisioning_status,
    source: row.source,
    shell: safeJsonParse<Record<string, unknown>>(row.shell_json),
    modules: safeJsonParse<WorkspaceModulePayload[]>(row.modules_json),
    orchestration: safeJsonParse<Record<string, unknown>>(row.orchestration_json),
    summary: safeJsonParse<string[]>(row.summary_json),
    context: safeJsonParse<WorkspaceContextPayload>(row.context_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function parseProvisionWorkspaceInput(value: unknown):
  | { ok: true; data: ProvisionWorkspaceInput }
  | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: 'Onboarding payload must be an object.' };
  }

  const formation = value.formation;
  if (!isRecord(formation)) {
    return { ok: false, error: 'Onboarding formation payload is required.' };
  }

  const modules = formation.modules;
  if (!Array.isArray(modules) || modules.length === 0) {
    return { ok: false, error: 'At least one workspace module is required for provisioning.' };
  }

  const summary = formation.summary;
  if (!Array.isArray(summary)) {
    return { ok: false, error: 'Workspace summary must be an array.' };
  }

  if (
    !isNonEmptyString(formation.workspaceId)
    || !isNonEmptyString(formation.workspaceName)
    || !isNonEmptyString(formation.workspaceSlug)
    || !isNonEmptyString(formation.primaryRoute)
    || typeof formation.capabilityScore !== 'number'
    || !isRecord(formation.shell)
    || !isRecord(formation.orchestration)
  ) {
    return { ok: false, error: 'Workspace formation payload is incomplete.' };
  }

  const normalizedModules: WorkspaceModulePayload[] = [];
  for (const module of modules) {
    if (!isRecord(module)) {
      return { ok: false, error: 'Workspace module entries must be objects.' };
    }

    if (
      !isNonEmptyString(module.id)
      || !isNonEmptyString(module.label)
      || !isNonEmptyString(module.route)
      || typeof module.priority !== 'number'
      || typeof module.enabled !== 'boolean'
    ) {
      return { ok: false, error: 'Workspace module payload is incomplete.' };
    }

    normalizedModules.push({
      id: module.id.trim(),
      label: module.label.trim(),
      route: module.route.trim(),
      priority: module.priority,
      enabled: module.enabled,
    });
  }

  const normalizedSummary: string[] = [];
  for (const item of summary) {
    if (!isNonEmptyString(item)) {
      return { ok: false, error: 'Workspace summary entries must be non-empty strings.' };
    }
    normalizedSummary.push(item.trim());
  }

  const context = isRecord(value.context) ? value.context : {};
  const normalizedContext: WorkspaceContextPayload = {
    workspace: isRecord(context.workspace) ? context.workspace : {},
    preferences: isRecord(context.preferences) ? context.preferences : {},
  };

  return {
    ok: true,
    data: {
      formation: {
        workspaceId: formation.workspaceId.trim(),
        workspaceName: formation.workspaceName.trim(),
        workspaceSlug: formation.workspaceSlug.trim(),
        primaryRoute: formation.primaryRoute.trim(),
        capabilityScore: formation.capabilityScore,
        shell: formation.shell,
        modules: normalizedModules,
        orchestration: formation.orchestration,
        summary: normalizedSummary,
      },
      context: normalizedContext,
      source: isNonEmptyString(value.source) ? value.source.trim() : undefined,
    },
  };
}

export async function provisionUserWorkspace(
  db: D1Database,
  userId: string,
  input: ProvisionWorkspaceInput,
  options?: { status?: ProvisioningStatus; source?: string }
): Promise<ProvisionedWorkspaceRecord> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const provisioningStatus = options?.status || 'active';
  const source = options?.source || input.source || 'onboarding';

  await db
    .prepare(
      `INSERT INTO onboarding_workspaces (
        id, user_id, workspace_id, workspace_name, workspace_slug, primary_route,
        capability_score, provisioning_status, source, shell_json, modules_json,
        orchestration_json, summary_json, context_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, workspace_slug) DO UPDATE SET
        workspace_id = excluded.workspace_id,
        workspace_name = excluded.workspace_name,
        primary_route = excluded.primary_route,
        capability_score = excluded.capability_score,
        provisioning_status = excluded.provisioning_status,
        source = excluded.source,
        shell_json = excluded.shell_json,
        modules_json = excluded.modules_json,
        orchestration_json = excluded.orchestration_json,
        summary_json = excluded.summary_json,
        context_json = excluded.context_json,
        updated_at = excluded.updated_at`
    )
    .bind(
      id,
      userId,
      input.formation.workspaceId,
      input.formation.workspaceName,
      input.formation.workspaceSlug,
      input.formation.primaryRoute,
      input.formation.capabilityScore,
      provisioningStatus,
      source,
      JSON.stringify(input.formation.shell),
      JSON.stringify(input.formation.modules),
      JSON.stringify(input.formation.orchestration),
      JSON.stringify(input.formation.summary),
      JSON.stringify(input.context),
      now,
      now,
    )
    .run();

  const persisted = await getCurrentProvisionedWorkspace(db, userId);
  if (!persisted) {
    throw new Error('Workspace provisioning could not be verified after persistence.');
  }

  return persisted;
}

export async function getCurrentProvisionedWorkspace(
  db: D1Database,
  userId: string
): Promise<ProvisionedWorkspaceRecord | null> {
  const row = await db
    .prepare(
      `SELECT *
       FROM onboarding_workspaces
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .bind(userId)
    .first<OnboardingWorkspaceRow>();

  return row ? mapProvisionedWorkspace(row) : null;
}

export async function activateProvisionedWorkspaces(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE onboarding_workspaces
       SET provisioning_status = 'active', updated_at = ?
       WHERE user_id = ? AND provisioning_status != 'active'`
    )
    .bind(new Date().toISOString(), userId)
    .run();
}
