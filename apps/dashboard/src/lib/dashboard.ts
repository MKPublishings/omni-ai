import { AuthUser, authorizedFetch, getApiUrl, getStoredToken } from './auth'

export const LIVE_REFRESH_INTERVAL_MS = 120000

export interface DashboardHealthStatus {
  status: string
  timestamp: string
  checks: {
    d1: string
    kv: string
    assets: string
  }
  deployment: {
    environment: string
    platform: string
    region: string
    version: string
  }
  summary: {
    authUsers: number
    toolExecutions: number
    simulationRuns: number
    publicRoutes: number
    workspaceRoutes: number
  }
  routes: {
    public: string[]
    workspace: string[]
  }
}

export interface DashboardSystemStatus {
  version: string
  status: string
  uptime: number
  timestamp: string
  counts: {
    authUsers: number
    sessions: number
    toolExecutions: number
    simulationRuns: number
  }
  environment: {
    region: string
    platform: string
  }
}

export interface DashboardSystemEvent {
  id: string
  type: string
  source: string
  data: unknown
  createdAt: string
}

export interface DashboardToolMetadata {
  name: string
  version?: string
  description?: string
}

export interface DashboardSimulationRun {
  id: string
  session_id: string
  mode: string
  status: string
  created_at: string
  updated_at?: string
  current_step?: number
}

export interface DashboardSimulationStateEntity {
  id?: string
  type?: string
  [key: string]: unknown
}

export interface DashboardSimulationState {
  entities: DashboardSimulationStateEntity[]
  environment: Record<string, unknown>
  rules: Array<Record<string, unknown>>
  stepNumber: number
  timestamp: string
  metadata: Record<string, unknown>
}

export interface DashboardSimulationSnapshotMeta {
  step: number
  checksum: string
  createdAt: string
}

export interface DashboardSimulationRecord extends DashboardSimulationRun {
  config?: string
  seed?: string | null
  max_steps?: number | null
  completed_at?: string | null
}

export interface DashboardSimulationStateResponse {
  simulation: DashboardSimulationRecord
  latestSnapshot: DashboardSimulationSnapshotMeta | null
  state: DashboardSimulationState | null
}

export interface DashboardSimulationStreamMessage {
  type: 'connection' | 'snapshot' | 'update' | 'error'
  simulationId?: string
  timestamp?: string
  pollIntervalMs?: number
  simulation?: DashboardSimulationRecord
  snapshot?: DashboardSimulationSnapshotMeta | null
  state?: DashboardSimulationState | null
  error?: string
}

export interface DashboardChatPreferences {
  persistHistory: boolean
  contextCarryover: boolean
  updatedAt: string
}

export interface DashboardChatHistoryTurn {
  id: number
  sessionId: string
  userId: string
  mode: string
  userText: string
  assistantText: string
  emotionalTone: string
  createdAt: string
}

export interface DashboardOnboardingWorkspaceModule {
  id: string
  label: string
  route: string
  priority: number
  enabled: boolean
}

export interface DashboardOnboardingWorkspaceContext {
  workspace?: Record<string, unknown>
  preferences?: Record<string, unknown>
}

export interface DashboardOnboardingWorkspace {
  id: string
  userId: string
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
  primaryRoute: string
  capabilityScore: number
  provisioningStatus: 'pending-verification' | 'active'
  source: string
  shell: Record<string, unknown>
  modules: DashboardOnboardingWorkspaceModule[]
  orchestration: Record<string, unknown>
  summary: string[]
  context: DashboardOnboardingWorkspaceContext
  createdAt: string
  updatedAt: string
}

export interface DashboardOnboardingWorkspaceInput {
  formation: {
    workspaceId: string
    workspaceName: string
    workspaceSlug: string
    primaryRoute: string
    capabilityScore: number
    shell: Record<string, unknown>
    modules: DashboardOnboardingWorkspaceModule[]
    orchestration: Record<string, unknown>
    summary: string[]
  }
  context: {
    workspace: Record<string, unknown>
    preferences: Record<string, unknown>
  }
}

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return 'just started'
  }

  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }

  return `${Math.max(1, Math.floor(totalSeconds))}s`
}

export function summarizeEventPayload(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return 'Event recorded'
  }

  const payload = data as Record<string, unknown>
  const summaryFields = ['message', 'summary', 'status', 'detail', 'mode', 'taskType']

  for (const field of summaryFields) {
    const value = payload[field]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return Object.entries(payload)
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' | ') || 'Event recorded'
}

async function fetchAuthorizedJson<T>(path: string): Promise<T> {
  const response = await authorizedFetch(getLiveApiUrl(path), {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed for ${path}: ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function fetchAuthorizedJsonWithInit<T>(path: string, init: RequestInit): Promise<T> {
  const response = await authorizedFetch(getApiUrl(path), init)

  if (!response.ok) {
    throw new Error(`Request failed for ${path}: ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function fetchAuthorizedMutation<T>(path: string, init: RequestInit): Promise<T> {
  const response = await authorizedFetch(getApiUrl(path), init)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const errorMessage = typeof (payload as { error?: unknown }).error === 'string'
      ? String((payload as { error: string }).error)
      : `Request failed for ${path}: ${response.status}`
    throw new Error(errorMessage)
  }

  return payload as T
}

export function fetchDashboardUser(): Promise<{ user: AuthUser }> {
  return process.env.NEXT_PUBLIC_ION_API_URL?.trim()
    ? fetchAuthorizedJson('/api/auth/me')
    : fetchAuthorizedJsonWithInit('/api/auth/me', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
}

export async function fetchOnboardingWorkspace(): Promise<DashboardOnboardingWorkspace | null> {
  const payload = process.env.NEXT_PUBLIC_ION_API_URL?.trim()
    ? await fetchAuthorizedJson<{ workspace: DashboardOnboardingWorkspace | null }>('/api/onboarding/workspace')
    : await fetchAuthorizedJsonWithInit<{ workspace: DashboardOnboardingWorkspace | null }>('/api/onboarding/workspace', {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
  return payload.workspace ?? null
}

export function provisionOnboardingWorkspace(input: DashboardOnboardingWorkspaceInput): Promise<{ workspace: DashboardOnboardingWorkspace }> {
  return fetchAuthorizedMutation('/api/onboarding/workspace', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
}

export function fetchSystemStatus(): Promise<DashboardSystemStatus> {
  return fetchAuthorizedJson('/api/system/status')
}

export async function fetchSystemEvents(limit = 8): Promise<DashboardSystemEvent[]> {
  const payload = await fetchAuthorizedJson<{ events: DashboardSystemEvent[] }>(`/api/system/events?limit=${limit}`)
  return Array.isArray(payload.events) ? payload.events : []
}

export async function fetchSimulationHistory(limit = 12): Promise<DashboardSimulationRun[]> {
  const payload = await fetchAuthorizedJson<{ runs: DashboardSimulationRun[] }>(`/api/simulation/history?limit=${limit}`)
  return Array.isArray(payload.runs) ? payload.runs : []
}

export async function fetchSimulationState(simulationId: string): Promise<DashboardSimulationStateResponse> {
  const payload = await fetchAuthorizedJson<DashboardSimulationStateResponse>(`/api/simulation/state?id=${encodeURIComponent(simulationId)}`)

  return {
    simulation: payload.simulation,
    latestSnapshot: payload.latestSnapshot
      ? {
          step: Number(payload.latestSnapshot.step ?? 0),
          checksum: String(payload.latestSnapshot.checksum || ''),
          createdAt: String(payload.latestSnapshot.createdAt || ''),
        }
      : null,
    state: payload.state,
  }
}

export async function fetchTools(): Promise<DashboardToolMetadata[]> {
  const payload = await fetchAuthorizedJson<{ tools: DashboardToolMetadata[] }>('/api/tools')
  return Array.isArray(payload.tools) ? payload.tools : []
}

export async function fetchPublicHealth(): Promise<DashboardHealthStatus> {
  const response = await fetch(getLiveApiUrl('/api/system/health'), {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed for /api/system/health: ${response.status}`)
  }

  return response.json() as Promise<DashboardHealthStatus>
}

function getLiveApiUrl(path: string): string {
  const apiUrl = getApiUrl(path)
  const separator = apiUrl.includes('?') ? '&' : '?'
  return `${apiUrl}${separator}_=${Date.now()}`
}

export function getSimulationStreamUrl(simulationId: string): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const token = getStoredToken()
  const baseUrl = getApiUrl(`/api/simulation/stream?id=${encodeURIComponent(simulationId)}`)
  const resolvedUrl = baseUrl.startsWith('http://') || baseUrl.startsWith('https://')
    ? new URL(baseUrl)
    : new URL(baseUrl, window.location.origin)

  resolvedUrl.protocol = resolvedUrl.protocol === 'https:' ? 'wss:' : 'ws:'

  if (token) {
    resolvedUrl.searchParams.set('token', token)
  }

  return resolvedUrl.toString()
}

export function fetchChatSettings(): Promise<{ preferences: DashboardChatPreferences }> {
  return fetchAuthorizedJson('/api/chat/settings')
}

export function updateChatSettings(input: Partial<Pick<DashboardChatPreferences, 'persistHistory' | 'contextCarryover'>>): Promise<{ preferences: DashboardChatPreferences }> {
  return fetchAuthorizedMutation('/api/chat/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
}

export function fetchChatHistory(limit = 120): Promise<{ turns: DashboardChatHistoryTurn[]; preferences: DashboardChatPreferences }> {
  return fetchAuthorizedJson(`/api/chat/history?limit=${limit}`)
}

export function clearChatHistory(): Promise<{ ok: boolean; deletedCount: number }> {
  return fetchAuthorizedMutation('/api/chat/history', {
    method: 'DELETE',
  })
}