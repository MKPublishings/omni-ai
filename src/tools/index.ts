/**
 * @module ToolRegistry
 * @spec: tool-module-registry
 * 
 * Central registry that exports and indexes all available tools.
 */

import { ruleGeneratorTool } from './rule-generator';
import { entityGeneratorTool } from './entity-generator';
import { worldBuilderTool } from './world-builder';
import { simulationDebuggerTool } from './simulation-debugger';
import { memoryInspectorTool } from './memory-inspector';
import { specValidatorTool } from './spec-validator';
import { stateExporterTool } from './state-exporter';
import { schemaGeneratorTool } from './schema-generator';
import { codexLinkerTool } from './codex-linker';
import { modeProfilerTool } from './mode-profiler';

import type { ToolModule } from '../types/tool.types';

/**
 * All available tools
 */
export const ALL_TOOLS: ToolModule[] = [
  ruleGeneratorTool,
  entityGeneratorTool,
  worldBuilderTool,
  simulationDebuggerTool,
  memoryInspectorTool,
  specValidatorTool,
  stateExporterTool,
  schemaGeneratorTool,
  codexLinkerTool,
  modeProfilerTool,
];

/**
 * Tools by category
 */
export const TOOLS_BY_CATEGORY = {
  simulation: [ruleGeneratorTool, entityGeneratorTool, worldBuilderTool, simulationDebuggerTool],
  analysis: [memoryInspectorTool, specValidatorTool],
  generation: [stateExporterTool, schemaGeneratorTool],
  utility: [codexLinkerTool, modeProfilerTool],
};

/**
 * Tools by name for quick lookup
 */
export const TOOLS_BY_NAME = new Map<string, ToolModule>(
  ALL_TOOLS.map((tool) => [tool.name, tool])
);

export default ALL_TOOLS;
