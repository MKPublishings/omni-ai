/**
 * @module SpecValidator
 * @tool: spec-validator
 * 
 * Validate spec schemas against Ionirix specification standards.
 */

import type { ToolModule, ToolContext } from '../../types/tool.types';

export interface SpecValidatorInput {
  spec: Record<string, any>;
  strict?: boolean;
}

export interface SpecValidatorOutput {
  valid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

export const specValidatorTool: ToolModule = {
  name: 'spec-validator',
  version: '1.0.0',
  description: 'Validate spec schemas against standards',
  category: 'analysis',
  enabled: true,

  schema: {
    type: 'object',
    required: ['spec'],
    properties: {
      spec: { type: 'object', description: 'Spec object to validate' },
      strict: { type: 'boolean', description: 'Strict mode validation' },
    },
  },

  async validate(input: unknown): Promise<{ valid: boolean; errors?: string[] }> {
    const data = input as SpecValidatorInput;
    const errors: string[] = [];

    if (!data.spec || typeof data.spec !== 'object') {
      errors.push('spec is required and must be an object');
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  },

  async execute(input: unknown, context: ToolContext): Promise<SpecValidatorOutput> {
    const data = input as SpecValidatorInput;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!data.spec.name) errors.push('Spec missing required field: name');
    if (!data.spec.version) errors.push('Spec missing required field: version');
    if (!data.spec.description) warnings.push('Spec should have a description');

    const score = Math.max(0, 100 - errors.length * 25 - warnings.length * 10);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score,
    };
  },
};

export default specValidatorTool;
