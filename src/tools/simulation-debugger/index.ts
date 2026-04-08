/**
 * @module SimulationDebugger
 * @tool: simulation-debugger
 * 
 * Debug simulations by analyzing state transitions and rule application.
 */

import type { ToolModule, ToolContext } from '../../types/tool.types';

export interface SimulationDebuggerInput {
  simulationId: string;
  step?: number;
  includeTrace?: boolean;
}

export interface SimulationDebuggerOutput {
  debug: {
    simulationId: string;
    step: number;
    stateSnapshot: Record<string, any>;
    appliedRules: string[];
    trace?: string[];
  };
}

export const simulationDebuggerTool: ToolModule = {
  name: 'simulation-debugger',
  version: '1.0.0',
  description: 'Debug simulation state and rule application',
  category: 'simulation',
  enabled: true,

  schema: {
    type: 'object',
    required: ['simulationId'],
    properties: {
      simulationId: { type: 'string', description: 'Simulation ID to debug' },
      step: { type: 'number', description: 'Optional step number to inspect' },
      includeTrace: { type: 'boolean', description: 'Include execution trace' },
    },
  },

  async validate(input: unknown): Promise<{ valid: boolean; errors?: string[] }> {
    const data = input as SimulationDebuggerInput;
    const errors: string[] = [];

    if (!data.simulationId || typeof data.simulationId !== 'string') {
      errors.push('simulationId is required and must be a string');
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  },

  async execute(input: unknown, context: ToolContext): Promise<SimulationDebuggerOutput> {
    const data = input as SimulationDebuggerInput;

    // TODO: Fetch actual simulation state from context
    return {
      debug: {
        simulationId: data.simulationId,
        step: data.step || 0,
        stateSnapshot: {},
        appliedRules: [],
        trace: data.includeTrace ? [] : undefined,
      },
    };
  },
};

export default simulationDebuggerTool;
