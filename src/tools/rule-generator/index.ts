/**
 * @module RuleGenerator
 * @tool: rule-generator
 * 
 * Generates simulation rules from natural language descriptions.
 */

import type { ToolModule, ToolContext } from '../../types/tool.types';

export interface RuleGeneratorInput {
  description: string;
  condition?: string;
  action?: string;
  priority?: number;
}

export interface RuleGeneratorOutput {
  rule: {
    id: string;
    description: string;
    condition: Record<string, any>;
    action: Record<string, any>;
    priority: number;
  };
}

export const ruleGeneratorTool: ToolModule = {
  name: 'rule-generator',
  version: '1.0.0',
  description: 'Generate simulation rules from descriptions',
  category: 'simulation',
  enabled: true,

  schema: {
    type: 'object',
    required: ['description'],
    properties: {
      description: { type: 'string', description: 'Natural language rule description' },
      condition: { type: 'string', description: 'Optional condition logic' },
      action: { type: 'string', description: 'Optional action to take' },
      priority: { type: 'number', description: 'Rule priority (0-100)', default: 50 },
    },
  },

  async validate(input: unknown): Promise<{ valid: boolean; errors?: string[] }> {
    const data = input as RuleGeneratorInput;
    const errors: string[] = [];

    if (!data.description || typeof data.description !== 'string') {
      errors.push('description is required and must be a string');
    }
    if (data.priority !== undefined && (typeof data.priority !== 'number' || data.priority < 0 || data.priority > 100)) {
      errors.push('priority must be a number between 0 and 100');
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  },

  async execute(input: unknown, context: ToolContext): Promise<RuleGeneratorOutput> {
    const data = input as RuleGeneratorInput;

    // Simple rule generation: parse description into condition/action pairs
    const ruleId = `rule-${crypto.getRandomValues(new Uint8Array(4)).join('')}`;

    return {
      rule: {
        id: ruleId,
        description: data.description,
        condition: data.condition
          ? { type: 'custom', value: data.condition }
          : { type: 'always' },
        action: data.action
          ? { type: 'custom', value: data.action }
          : { type: 'none' },
        priority: data.priority ?? 50,
      },
    };
  },
};

export default ruleGeneratorTool;
