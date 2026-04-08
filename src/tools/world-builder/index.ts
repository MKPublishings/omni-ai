/**
 * @module WorldBuilder
 * @tool: world-builder
 * 
 * Builds simulation world state with environment and rules.
 */

import type { ToolModule, ToolContext } from '../../types/tool.types';

export interface WorldBuilderInput {
  worldName: string;
  environment?: Record<string, any>;
  rules?: Array<{ condition: string; action: string }>;
  initialEntities?: string[];
}

export interface WorldBuilderOutput {
  world: {
    id: string;
    name: string;
    environment: Record<string, any>;
    rules: Array<{ id: string; condition: string; action: string }>;
    entityCount: number;
  };
}

export const worldBuilderTool: ToolModule = {
  name: 'world-builder',
  version: '1.0.0',
  description: 'Build simulation worlds with environment state',
  category: 'simulation',
  enabled: true,

  schema: {
    type: 'object',
    required: ['worldName'],
    properties: {
      worldName: { type: 'string', description: 'Name of the world' },
      environment: { type: 'object', description: 'Environment variables' },
      rules: {
        type: 'array',
        items: { type: 'object', properties: { condition: { type: 'string' }, action: { type: 'string' } } },
      },
      initialEntities: { type: 'array', items: { type: 'string' } },
    },
  },

  async validate(input: unknown): Promise<{ valid: boolean; errors?: string[] }> {
    const data = input as WorldBuilderInput;
    const errors: string[] = [];

    if (!data.worldName || typeof data.worldName !== 'string') {
      errors.push('worldName is required and must be a string');
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  },

  async execute(input: unknown, context: ToolContext): Promise<WorldBuilderOutput> {
    const data = input as WorldBuilderInput;
    const worldId = `world-${crypto.getRandomValues(new Uint8Array(4)).join('')}`;

    return {
      world: {
        id: worldId,
        name: data.worldName,
        environment: data.environment || {},
        rules: (data.rules || []).map((r, i) => ({ id: `rule-${i}`, ...r })),
        entityCount: data.initialEntities?.length || 0,
      },
    };
  },
};

export default worldBuilderTool;
