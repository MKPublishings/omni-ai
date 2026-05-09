import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

interface HierarchySection {
  title: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

interface HierarchyPointFeature {
  id: string
  title: string
  eventType: string
}

interface HierarchyPointSnapshot {
  pointId: string
  slug: string
  title: string
  features: HierarchyPointFeature[]
  subscriptions: string[]
  tags: string[]
  templates: string[]
}

interface HierarchySummary {
  points: number
  features: number
  events: number
  subscriptions: number
  criticalViolations: number
}

export interface HierarchyCommandCenterData {
  generatedAt: string
  summary: HierarchySummary
  points: HierarchyPointSnapshot[]
  auditSections: HierarchySection[]
  busTopology: {
    emitters: Record<string, string[]>
    subscribers: Record<string, string[]>
  }
}

const PUBLISHED_DATASET_RELATIVE_PATH = ['src', 'data', 'hierarchy-command-center.json'] as const

const FALLBACK_POINT_TITLES: Record<string, string> = {
  P8: 'Sovereign Point',
  P7: 'Societal Point',
  P6: 'Legality Point',
  P5: 'Oversight Point',
  P4: 'Directive Point',
  P3: 'Managerial Point',
  P2: 'Operational Point',
  P1: 'Contact Point',
}

async function resolveRepoRoot(): Promise<string> {
  const candidates = [
    process.cwd(),
    resolve(process.cwd(), '..'),
    resolve(process.cwd(), '..', '..'),
  ]

  for (const candidate of candidates) {
    try {
      await access(resolve(candidate, 'ionirix-hierarchy', 'hierarchy.config.json'))
      return candidate
    } catch {
      // Try the next plausible workspace root.
    }
  }

  return resolve(process.cwd(), '..', '..')
}

async function readHierarchyDataFromPath(filePath: string): Promise<HierarchyCommandCenterData | null> {
  try {
    const raw = await readFile(filePath, 'utf8')
    return JSON.parse(raw) as HierarchyCommandCenterData
  } catch {
    return null
  }
}

async function readPublishedHierarchyData(): Promise<HierarchyCommandCenterData | null> {
  const candidates = [
    resolve(process.cwd(), ...PUBLISHED_DATASET_RELATIVE_PATH),
    resolve(process.cwd(), 'apps', 'dashboard', ...PUBLISHED_DATASET_RELATIVE_PATH),
  ]

  for (const candidate of candidates) {
    const data = await readHierarchyDataFromPath(candidate)
    if (data) {
      return data
    }
  }

  return null
}

export async function loadHierarchyCommandCenterData(): Promise<HierarchyCommandCenterData> {
  const repoRoot = await resolveRepoRoot()
  const reportsPath = resolve(repoRoot, 'ionirix-hierarchy', 'docs', 'reports', 'command-center-data.json')

  const liveData = await readHierarchyDataFromPath(reportsPath)
  if (liveData) {
    return liveData
  }

  const publishedData = await readPublishedHierarchyData()
  if (publishedData) {
    return publishedData
  }

  return buildFallbackHierarchyData(repoRoot)
}

async function buildFallbackHierarchyData(repoRoot: string): Promise<HierarchyCommandCenterData> {
  const configPath = resolve(repoRoot, 'ionirix-hierarchy', 'hierarchy.config.json')
  const auditPath = resolve(repoRoot, 'ionirix-hierarchy', 'docs', 'reports', 'audit-report.json')

  const [configRaw, auditRaw] = await Promise.all([
    readFile(configPath, 'utf8').catch(() => null),
    readFile(auditPath, 'utf8').catch(() => '{}'),
  ])

  if (!configRaw) {
    return {
      generatedAt: new Date().toISOString(),
      summary: {
        points: 0,
        features: 0,
        events: 0,
        subscriptions: 0,
        criticalViolations: 0,
      },
      points: [],
      auditSections: [
        {
          title: 'Hierarchy workspace',
          status: 'warn',
          detail: 'The ionirix-hierarchy workspace is not bundled into this dashboard deployment, so live hierarchy source files are unavailable in this environment.',
        },
      ],
      busTopology: {
        emitters: {},
        subscribers: {},
      },
    }
  }

  const config = JSON.parse(configRaw) as {
    points: Array<{ id: string; slug: string; features: string[] }>
    eventTypes: string[]
    busTopology: { emitters: Record<string, string[]>; subscribers: Record<string, string[]> }
  }
  const audit = JSON.parse(auditRaw) as {
    generatedAt?: string
    summary?: { criticalCount?: number }
    sections?: HierarchySection[]
  }

  const points = config.points.map((point) => ({
    pointId: point.id,
    slug: point.slug,
    title: FALLBACK_POINT_TITLES[point.id] ?? point.slug,
    features: point.features.map((featureId) => ({
      id: featureId,
      title: featureId
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
      eventType: config.busTopology.emitters[point.id]?.find((eventName) => eventName.includes(featureId.split('-')[0])) ?? 'authorized.event',
    })),
    subscriptions: config.busTopology.subscribers[point.id] ?? [],
    tags: [point.slug.replace(/^P\d-/, ''), 'hierarchy'],
    templates: [],
  }))

  return {
    generatedAt: audit.generatedAt ?? new Date().toISOString(),
    summary: {
      points: config.points.length,
      features: points.reduce((count, point) => count + point.features.length, 0),
      events: config.eventTypes.length,
      subscriptions: points.reduce((count, point) => count + point.subscriptions.length, 0),
      criticalViolations: audit.summary?.criticalCount ?? 0,
    },
    points,
    auditSections: audit.sections ?? [],
    busTopology: config.busTopology,
  }
}