import dashboardSchema from './dashboard.schema.json';
import editorialSchema from './editorial.schema.json';
import onboardingSchema from './onboarding.schema.json';
export * from './revisionFixtures';
import type { LayoutSchema } from '@/types';

const defaultSchemas = [
  onboardingSchema as LayoutSchema,
  dashboardSchema as LayoutSchema,
  editorialSchema as LayoutSchema,
];

const getSurfaceIdCandidates = (surfaceId: string): string[] => {
  const normalized = surfaceId.trim();

  return Array.from(new Set([
    normalized,
    normalized.endsWith('-root') ? normalized.slice(0, -5) : `${normalized}-root`,
  ])).filter(Boolean);
};

export const getDefaultSchemaBySurfaceId = (surfaceId: string): LayoutSchema | undefined => {
  const candidates = getSurfaceIdCandidates(surfaceId);

  return defaultSchemas.find((schema) => candidates.includes(schema.surface.id));
};

export { dashboardSchema, editorialSchema, onboardingSchema };