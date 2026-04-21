import dashboardSchema from './dashboard.schema.json';
import editorialSchema from './editorial.schema.json';
import onboardingSchema from './onboarding.schema.json';
import type { LayoutSchema } from '@/types';

type FixtureRevision = 1 | 2 | 3;

const baseSchemas: Record<string, LayoutSchema> = {
  'onboarding-root': onboardingSchema as LayoutSchema,
  'dashboard-root': dashboardSchema as LayoutSchema,
  'editorial-root': editorialSchema as LayoutSchema,
};

const getSurfaceIdCandidates = (surfaceId: string): string[] => {
  const normalized = surfaceId.trim();

  return Array.from(new Set([
    normalized,
    normalized.endsWith('-root') ? normalized.slice(0, -5) : `${normalized}-root`,
  ])).filter(Boolean);
};

const createFixture = (schema: LayoutSchema, revision: FixtureRevision): LayoutSchema => ({
  ...schema,
  version: revision === 1 ? schema.version : revision === 2 ? '1.1.0' : '2.0.0',
  migration: {
    family: schema.migration?.family ?? 'ionirix-emergent-ui',
    revision,
    ...(revision === 2 ? { backwardCompatibleWith: [1] } : {}),
    ...(revision === 3 ? { backwardCompatibleWith: [2] } : {}),
  },
});

export const schemaRevisionFixtures: Record<string, Record<FixtureRevision, LayoutSchema>> = Object.fromEntries(
  Object.entries(baseSchemas).map(([surfaceId, schema]) => [surfaceId, {
    1: createFixture(schema, 1),
    2: createFixture(schema, 2),
    3: createFixture(schema, 3),
  }]),
) as Record<string, Record<FixtureRevision, LayoutSchema>>;

export const getSchemaRevisionFixture = (surfaceId: string, revision: FixtureRevision): LayoutSchema | undefined => {
  const candidates = getSurfaceIdCandidates(surfaceId);
  const matchedSurfaceId = Object.keys(schemaRevisionFixtures).find((candidate) => candidates.includes(candidate));

  return matchedSurfaceId ? schemaRevisionFixtures[matchedSurfaceId]?.[revision] : undefined;
};