import { AuthUser, authorizedFetch, getApiUrl } from './auth'

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
  const response = await authorizedFetch(getApiUrl(path))

  if (!response.ok) {
    throw new Error(`Request failed for ${path}: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function fetchDashboardUser(): Promise<{ user: AuthUser }> {
  return fetchAuthorizedJson('/api/auth/me')
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

export async function fetchTools(): Promise<DashboardToolMetadata[]> {
  const payload = await fetchAuthorizedJson<{ tools: DashboardToolMetadata[] }>('/api/tools')
  return Array.isArray(payload.tools) ? payload.tools : []
}

export async function fetchPublicHealth(): Promise<DashboardHealthStatus> {
  const response = await fetch(getApiUrl('/api/system/health'))

  if (!response.ok) {
    throw new Error(`Request failed for /api/system/health: ${response.status}`)
  }

  return response.json() as Promise<DashboardHealthStatus>
}