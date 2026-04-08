/**
 * @module SchemaGenerator
 * @tool: schema-generator
 * 
 * Generate JSON Schema from TypeScript types or sample objects.
 */

import type { ToolModule, ToolContext } from '../../types/tool.types';

export interface SchemaGeneratorInput {
  sample: Record<string, any>;
  name?: string;
  strict?: boolean;
}

export interface SchemaGeneratorOutput {
  schema: {
    $schema: string;
    type: string;
    properties: Record<string, any>;
    required: string[];
    title?: string;
  };
}

export const schemaGeneratorTool: ToolModule = {
  name: 'schema-generator',
  version: '1.0.0',
  description: 'Generate JSON Schema from sample objects',
  category: 'generation',
  enabled: true,

  schema: {
    type: 'object',
    required: ['sample'],
    properties: {
      sample: { type: 'object', description: 'Sample object to generate schema from' },
      name: { type: 'string', description: 'Schema name/title' },
      strict: { type: 'boolean', description: 'Strict schema generation' },
    },
  },

  async validate(input: unknown): Promise<{ valid: boolean; errors?: string[] }> {
    const data = input as SchemaGeneratorInput;
    const errors: string[] = [];

    if (!data.sample || typeof data.sample !== 'object') {
      errors.push('sample is required and must be an object');
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  },

  async execute(input: unknown, context: ToolContext): Promise<SchemaGeneratorOutput> {
    const data = input as SchemaGeneratorInput;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    // Infer schema from sample
    for (const [key, value] of Object.entries(data.sample)) {
      let type = 'string';
      if (typeof value === 'number') type = 'number';
      else if (typeof value === 'boolean') type = 'boolean';
      else if (Array.isArray(value)) type = 'array';
      else if (typeof value === 'object') type = 'object';

      properties[key] = { type };
      required.push(key);
    }

    return {
      schema: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties,
        required,
        title: data.name,
      },
    };
  },
};

export default schemaGeneratorTool;
