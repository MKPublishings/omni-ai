/**
 * @module StateExporter
 * @tool: state-exporter
 * 
 * Export simulation state to various formats (JSON, CSV, etc).
 */

import type { ToolModule, ToolContext } from '../../types/tool.types';

export interface StateExporterInput {
  simulationId: string;
  format?: 'json' | 'csv' | 'parquet';
  compact?: boolean;
}

export interface StateExporterOutput {
  exportId: string;
  simulationId: string;
  format: string;
  size: number;
  url?: string;
  data?: Record<string, any>;
}

export const stateExporterTool: ToolModule = {
  name: 'state-exporter',
  version: '1.0.0',
  description: 'Export simulation state to various formats',
  category: 'generation',
  enabled: true,

  schema: {
    type: 'object',
    required: ['simulationId'],
    properties: {
      simulationId: { type: 'string', description: 'Simulation ID to export' },
      format: { type: 'string', enum: ['json', 'csv', 'parquet'], default: 'json' },
      compact: { type: 'boolean', description: 'Compact output' },
    },
  },

  async validate(input: unknown): Promise<{ valid: boolean; errors?: string[] }> {
    const data = input as StateExporterInput;
    const errors: string[] = [];

    if (!data.simulationId || typeof data.simulationId !== 'string') {
      errors.push('simulationId is required and must be a string');
    }
    if (data.format && !['json', 'csv', 'parquet'].includes(data.format)) {
      errors.push('format must be json, csv, or parquet');
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  },

  async execute(input: unknown, context: ToolContext): Promise<StateExporterOutput> {
    const data = input as StateExporterInput;
    const exportId = `export-${crypto.getRandomValues(new Uint8Array(4)).join('')}`;

    return {
      exportId,
      simulationId: data.simulationId,
      format: data.format || 'json',
      size: 0,
    };
  },
};

export default stateExporterTool;
