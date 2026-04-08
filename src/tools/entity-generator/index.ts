/**
 * @module EntityGenerator
 * @tool: entity-generator
 * 
 * Generates simulation entities with properties and behaviors.
 */

import type { ToolModule, ToolContext } from '../../types/tool.types';

export interface EntityGeneratorInput {
  entityType: string;
  attributes?: Record<string, any>;
  behaviors?: string[];
}

export interface EntityGeneratorOutput {
  entity: {
    id: string;
    type: string;
    attributes: Record<string, any>;
    behaviors: Array<{ id: string; name: string }>;
  };
}

export const entityGeneratorTool: ToolModule = {
  name: 'entity-generator',
  version: '1.0.0',
  description: 'Generate simulation entities with properties',
  category: 'simulation',
  enabled: true,

  schema: {
    type: 'object',
    required: ['entityType'],
    properties: {
      entityType: { type: 'string', description: 'Type of entity to generate' },
      attributes: { type: 'object', description: 'Custom attributes' },
      behaviors: { type: 'array', items: { type: 'string' }, description: 'Behavior names' },
    },
  },

  async validate(input: unknown): Promise<{ valid: boolean; errors?: string[] }> {
    const data = input as EntityGeneratorInput;
    const errors: string[] = [];

    if (!data.entityType || typeof data.entityType !== 'string') {
      errors.push('entityType is required and must be a string');
    }
    if (data.attributes && typeof data.attributes !== 'object') {
      errors.push('attributes must be an object');
    }
    if (data.behaviors && (!Array.isArray(data.behaviors) || !data.behaviors.every((b) => typeof b === 'string'))) {
      errors.push('behaviors must be an array of strings');
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  },

  async execute(input: unknown, context: ToolContext): Promise<EntityGeneratorOutput> {
    const data = input as EntityGeneratorInput;
    const entityId = `entity-${crypto.getRandomValues(new Uint8Array(4)).join('')}`;

    return {
      entity: {
        id: entityId,
        type: data.entityType,
        attributes: data.attributes || {},
        behaviors: (data.behaviors || []).map((b) => ({
          id: `behavior-${b}`,
          name: b,
        })),
      },
    };
  },
};

export default entityGeneratorTool;
