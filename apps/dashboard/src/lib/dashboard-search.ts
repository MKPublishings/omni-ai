import type { AuthUser } from '@/lib/auth'
import { buildUserScopedStorageKey } from '@/lib/auth'

export interface DashboardSearchEntry {
  href: string
  title: string
  description: string
  section: string
  keywords: string[]
}

type DashboardSearchScopeSource = string | Pick<AuthUser, 'id' | 'email' | 'username'> | null | undefined

const DASHBOARD_RECENT_SEARCH_KEY = 'ionirix:dashboard:recent-searches'
const DEFAULT_RECENT_SEARCH_LIMIT = 8

export const dashboardSearchEntries: DashboardSearchEntry[] = [
  {
    href: '/workspace',
    title: 'Overview',
    description: 'System overview, workspace status, and operational summary.',
    section: 'Workspace',
    keywords: ['dashboard', 'home', 'overview', 'status', 'summary', 'workspace'],
  },
  {
    href: '/assistant',
    title: 'Ionirix',
    description: 'Assistant conversations, research, prompts, and execution guidance.',
    section: 'Workspace',
    keywords: ['assistant', 'chat', 'search', 'research', 'prompt', 'agent', 'help'],
  },
  {
    href: '/analytics',
    title: 'Analytics',
    description: 'Metrics, telemetry trends, and usage analysis across the workspace.',
    section: 'Observability',
    keywords: ['analytics', 'metrics', 'telemetry', 'reports', 'insights', 'usage'],
  },
  {
    href: '/events',
    title: 'Events',
    description: 'Event streams, system activity, and recorded operational changes.',
    section: 'Observability',
    keywords: ['events', 'logs', 'activity', 'audit', 'timeline', 'history'],
  },
  {
    href: '/simulations',
    title: 'Simulations',
    description: 'Simulation runs, scenarios, and modeled execution states.',
    section: 'Modeling',
    keywords: ['simulation', 'simulations', 'scenario', 'runs', 'models', 'forecast'],
  },
  {
    href: '/hierarchy',
    title: 'Hierarchy',
    description: 'Eight-point hierarchy command center, compliance spine, and bus topology.',
    section: 'Operations',
    keywords: ['hierarchy', 'constitution', 'sovereign', 'topology', 'compliance', 'points', 'bus'],
  },
  {
    href: '/tools',
    title: 'Tools',
    description: 'Tool registry, utilities, and runtime support modules.',
    section: 'Operations',
    keywords: ['tools', 'utilities', 'engines', 'validators', 'tooling'],
  },
  {
    href: '/memory',
    title: 'Memory',
    description: 'Workspace memory, saved context, and historical records.',
    section: 'Operations',
    keywords: ['memory', 'archive', 'history', 'context', 'records', 'saved'],
  },
  {
    href: '/pricing',
    title: 'Pricing',
    description: 'Plan selection, subscription comparison, and upgrade options.',
    section: 'Account',
    keywords: ['pricing', 'plans', 'upgrade', 'subscription', 'cost', 'billing', 'payment'],
  },
  {
    href: '/billing/manage',
    title: 'Billing',
    description: 'Billing management, invoices, checkout state, and subscription control.',
    section: 'Account',
    keywords: ['billing', 'invoice', 'payment', 'checkout', 'subscription', 'manage'],
  },
  {
    href: '/profile',
    title: 'Profile',
    description: 'User profile, account identity, and personal details.',
    section: 'Account',
    keywords: ['profile', 'account', 'identity', 'user', 'details'],
  },
  {
    href: '/settings',
    title: 'Settings',
    description: 'Workspace preferences, shell configuration, and appearance controls.',
    section: 'Account',
    keywords: ['settings', 'preferences', 'configuration', 'theme', 'layout'],
  },
]

function normalizeSearchText(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function buildSearchTokens(value: string): string[] {
  return Array.from(new Set(normalizeSearchText(value).split(' ').filter(Boolean)))
}

function scoreSearchEntry(entry: DashboardSearchEntry, normalizedQuery: string, queryTokens: string[]): number {
  const title = normalizeSearchText(entry.title)
  const description = normalizeSearchText(entry.description)
  const section = normalizeSearchText(entry.section)
  const href = normalizeSearchText(entry.href.replace(/\//g, ' '))
  const keywords = entry.keywords.map((keyword) => normalizeSearchText(keyword))

  let score = 0

  for (const token of queryTokens) {
    let tokenScore = 0

    if (title === token) {
      tokenScore = Math.max(tokenScore, 90)
    } else if (title.startsWith(token)) {
      tokenScore = Math.max(tokenScore, 70)
    } else if (title.includes(token)) {
      tokenScore = Math.max(tokenScore, 55)
    }

    if (keywords.some((keyword) => keyword === token)) {
      tokenScore = Math.max(tokenScore, 50)
    } else if (keywords.some((keyword) => keyword.includes(token))) {
      tokenScore = Math.max(tokenScore, 36)
    }

    if (description.includes(token)) {
      tokenScore = Math.max(tokenScore, 24)
    }

    if (section.includes(token)) {
      tokenScore = Math.max(tokenScore, 18)
    }

    if (href.includes(token)) {
      tokenScore = Math.max(tokenScore, 16)
    }

    if (tokenScore === 0) {
      return 0
    }

    score += tokenScore
  }

  if (title === normalizedQuery) {
    score += 140
  } else if (title.startsWith(normalizedQuery)) {
    score += 95
  } else if (title.includes(normalizedQuery)) {
    score += 70
  }

  if (keywords.some((keyword) => keyword === normalizedQuery)) {
    score += 65
  } else if (keywords.some((keyword) => keyword.includes(normalizedQuery))) {
    score += 45
  }

  if (description.includes(normalizedQuery)) {
    score += 28
  }

  if (href.includes(normalizedQuery)) {
    score += 20
  }

  return score
}

function sanitizeRecentSearches(values: unknown, limit = DEFAULT_RECENT_SEARCH_LIMIT): string[] {
  if (!Array.isArray(values)) {
    return []
  }

  return values
    .map((value) => String(value || '').trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .filter((value, index, array) => array.findIndex((entry) => entry.toLowerCase() === value.toLowerCase()) === index)
    .slice(0, limit)
}

function safeParseRecentSearches(value: string | null): string[] {
  if (!value) {
    return []
  }

  try {
    return sanitizeRecentSearches(JSON.parse(value))
  } catch {
    return []
  }
}

export function searchDashboardEntries(query: string, entries: DashboardSearchEntry[] = dashboardSearchEntries, limit = DEFAULT_RECENT_SEARCH_LIMIT): DashboardSearchEntry[] {
  const normalizedQuery = normalizeSearchText(query)
  const queryTokens = buildSearchTokens(query)

  if (!normalizedQuery || queryTokens.length === 0) {
    return []
  }

  return entries
    .map((entry) => ({ entry, score: scoreSearchEntry(entry, normalizedQuery, queryTokens) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      return left.entry.title.localeCompare(right.entry.title)
    })
    .slice(0, limit)
    .map((candidate) => candidate.entry)
}

export function recordDashboardRecentSearch(query: string, recentSearches: string[], limit = DEFAULT_RECENT_SEARCH_LIMIT): string[] {
  const normalizedQuery = String(query || '').trim().replace(/\s+/g, ' ')

  if (!normalizedQuery) {
    return sanitizeRecentSearches(recentSearches, limit)
  }

  return sanitizeRecentSearches(
    [normalizedQuery, ...recentSearches.filter((entry) => entry.toLowerCase() !== normalizedQuery.toLowerCase())],
    limit
  )
}

export function readStoredDashboardRecentSearches(scopeSource?: DashboardSearchScopeSource): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  return safeParseRecentSearches(window.localStorage.getItem(buildUserScopedStorageKey(DASHBOARD_RECENT_SEARCH_KEY, scopeSource)))
}

export function writeStoredDashboardRecentSearches(recentSearches: string[], scopeSource?: DashboardSearchScopeSource): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    buildUserScopedStorageKey(DASHBOARD_RECENT_SEARCH_KEY, scopeSource),
    JSON.stringify(sanitizeRecentSearches(recentSearches))
  )
}

export function clearStoredDashboardRecentSearches(scopeSource?: DashboardSearchScopeSource): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(buildUserScopedStorageKey(DASHBOARD_RECENT_SEARCH_KEY, scopeSource))
}