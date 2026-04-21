import { z } from 'zod';
import type { LayoutSchema } from '@/types';

const responsiveSchema = z.object({
  collapse: z.enum(['hide', 'minimize', 'stack', 'merge']).optional(),
  threshold: z.number().int().optional(),
  reflow: z.boolean().optional(),
});

const constraintsSchema = z.object({
  minWidth: z.string().optional(),
  maxWidth: z.string().optional(),
  minHeight: z.string().optional(),
  aspectRatio: z.string().optional(),
});

const zoneSchema = z.object({
  id: z.string(),
  component: z.string(),
  area: z.string().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  behavior: z.string().optional(),
  responsive: responsiveSchema.optional(),
  constraints: constraintsSchema.optional(),
});

const behaviorBindingSchema = z.object({
  id: z.string(),
  trigger: z.string(),
  action: z.string(),
  target: z.string().optional(),
  targetGroup: z.string().optional(),
  params: z.record(z.unknown()).optional(),
}).refine((binding) => binding.target !== undefined || binding.targetGroup !== undefined, {
  message: 'Behavior bindings require either target or targetGroup.',
});

const replayRoutingConditionSchema = z.object({
  machineState: z.array(z.string()).optional(),
  currentStep: z.array(z.number().int()).optional(),
  includesCapabilities: z.array(z.string()).optional(),
});

const replayRoutingRuleSchema = z.object({
  id: z.string(),
  when: replayRoutingConditionSchema.optional(),
  targetSurface: z.string(),
  availableTargetSurfaces: z.array(z.string()).optional(),
});

const replayRoutingPolicySchema = z.object({
  defaultTargetSurface: z.string().optional(),
  availableTargetSurfaces: z.array(z.string()).optional(),
  rules: z.array(replayRoutingRuleSchema).optional(),
});

const exportProfileSchema = z.object({
  includeSummary: z.boolean().optional(),
  includeMutationBatches: z.boolean().optional(),
  includeLayoutHashes: z.boolean().optional(),
  maxEvents: z.number().int().positive().optional(),
  maxMutationsPerEvent: z.number().int().positive().optional(),
});

const schemaMigrationSchema = z.object({
  family: z.string(),
  revision: z.number().int().positive(),
  backwardCompatibleWith: z.array(z.number().int().positive()).optional(),
});

const relationConditionSchema = z.object({
  zoneA: z.string().optional(),
  zoneB: z.string().optional(),
  zoneGroupA: z.string().optional(),
  zoneGroupB: z.string().optional(),
  relativePosition: z.enum(['above', 'below', 'left', 'right', 'overlapping']).optional(),
  overlap: z.boolean().optional(),
  minDistance: z.number().optional(),
  maxDistance: z.number().optional(),
  allowInverse: z.boolean().optional(),
});

const telemetryConditionSchema = z.object({
  match: z.enum(['all', 'any']).optional(),
  layoutMode: z.enum(['grid', 'stack', 'float']).optional(),
  minAbsHorizontalBalance: z.number().optional(),
  maxAbsHorizontalBalance: z.number().optional(),
  minAbsVerticalBalance: z.number().optional(),
  maxAbsVerticalBalance: z.number().optional(),
  minCollisionCount: z.number().int().optional(),
  maxCollisionCount: z.number().int().optional(),
  collisionSeverity: z.enum(['none', 'low', 'medium', 'high']).optional(),
  minZonePriority: z.number().int().optional(),
  maxZonePriority: z.number().int().optional(),
  relation: relationConditionSchema.optional(),
});

const telemetryMutationSchema = z.object({
  target: z.string().optional(),
  targetGroup: z.string().optional(),
  property: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
}).refine((mutation) => mutation.target !== undefined || mutation.targetGroup !== undefined, {
  message: 'Telemetry mutations require either target or targetGroup.',
});

const transitionPolicySchema = z.object({
  duration: z.string().optional(),
  easing: z.string().optional(),
  stagger: z.number().int().optional(),
  yOffset: z.number().int().optional(),
  scaleDelta: z.number().optional(),
  blurCollapsed: z.string().optional(),
});

export const layoutSchemaZod = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  migration: schemaMigrationSchema.optional(),
  surface: z.object({
    id: z.string(),
    type: z.enum(['grid', 'flex', 'stack', 'float', 'emergent']),
    replayTargetSurface: z.string().optional(),
    replayTargetSurfaces: z.array(z.string()).optional(),
    replayRouting: replayRoutingPolicySchema.optional(),
    defaultExportProfile: z.string().optional(),
    exportProfiles: z.record(exportProfileSchema).optional(),
    zoneGroups: z.record(z.array(z.string())).optional(),
    zones: z.array(zoneSchema),
    grid: z
      .object({
        columns: z.string(),
        rows: z.string(),
        gap: z.string(),
        areas: z.array(z.string()),
      })
      .optional(),
  }),
  behaviors: z
    .array(behaviorBindingSchema)
    .optional(),
  telemetry: z
    .object({
      rules: z.array(
        z.object({
          id: z.string(),
          when: telemetryConditionSchema.optional(),
          apply: z.array(telemetryMutationSchema),
          otherwise: z.array(telemetryMutationSchema).optional(),
        }),
      ),
    })
    .optional(),
  transitions: z
    .object({
      duration: z.string().optional(),
      easing: z.string().optional(),
      stagger: z.number().int().optional(),
      yOffset: z.number().int().optional(),
      scaleDelta: z.number().optional(),
      blurCollapsed: z.string().optional(),
      policies: z
        .object({
          default: transitionPolicySchema.optional(),
          reflow: transitionPolicySchema.optional(),
          behavior: transitionPolicySchema.optional(),
          telemetry: transitionPolicySchema.optional(),
          replay: transitionPolicySchema.optional(),
          presence: transitionPolicySchema.optional(),
        })
        .partial()
        .optional(),
    })
    .optional(),
  steps: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        component: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional(),
});

export const validateLayoutSchema = (schema: unknown): LayoutSchema => layoutSchemaZod.parse(schema) as LayoutSchema;