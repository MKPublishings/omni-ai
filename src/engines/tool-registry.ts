/**
 * @module ToolRegistry
 * @spec: tool-execution-contract
 * 
 * Manages tool definitions, discovery, and schema resolution.
 * Tools are registered at build time via static imports.
 * Provides efficient lookup and aggregation by category.
 */

import type { ToolModule } from '../types/tool.types';

export class ToolRegistry {
  private tools: Map<string, ToolModule> = new Map();
  private categories: Map<string, ToolModule[]> = new Map();

  /**
   * Register a tool module
   * Throws if tool with same name already registered
   */
  register(tool: ToolModule): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    this.tools.set(tool.name, tool);

    // Index by category
    const catTools = this.categories.get(tool.category) || [];
    catTools.push(tool);
    this.categories.set(tool.category, catTools);
  }

  /**
   * Get a tool by name
   */
  get(name: string): ToolModule | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * List all registered tools
   */
  list(): ToolModule[] {
    return Array.from(this.tools.values());
  }

  /**
   * List tools filtered by category
   */
  listByCategory(category: string): ToolModule[] {
    return this.categories.get(category) || [];
  }

  /**
   * Get all available categories
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Get the JSON Schema for a tool's input
   */
  getInputSchema(name: string): object | null {
    const tool = this.tools.get(name);
    return tool && tool.inputSchema ? tool.inputSchema : null;
  }

  /**
   * Get output schema for a tool
   */
  getOutputSchema(name: string): object | null {
    const tool = this.tools.get(name);
    return tool && tool.outputSchema ? tool.outputSchema : null;
  }

  /**
   * Get count of registered tools
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Get count of tools in a category
   */
  getCategorySize(category: string): number {
    return this.categories.get(category)?.length ?? 0;
  }

  /**
   * Get tool metadata for frontend display
   */
  getMetadata(name: string): {
    name: string;
    version: string;
    category: string;
    description: string;
    inputSchema: object;
    outputSchema: object;
  } | null {
    const tool = this.tools.get(name);
    if (!tool) return null;

    return {
      name: tool.name,
      version: tool.version,
      category: tool.category,
      description: tool.description,
      inputSchema: tool.inputSchema || {},
      outputSchema: tool.outputSchema || {},
    };
  }

  /**
   * Get all tools as metadata (for list endpoint)
   */
  getAllMetadata(): Array<ReturnType<ToolRegistry['getMetadata']>> {
    return this.list()
      .map((tool) => this.getMetadata(tool.name))
      .filter((m) => m !== null) as Array<ReturnType<ToolRegistry['getMetadata']>>;
  }

  /**
   * Clear all registered tools (mainly for testing)
   */
  clear(): void {
    this.tools.clear();
    this.categories.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalTools: this.size,
      byCategory: Object.fromEntries(
        this.getCategories().map((cat) => [cat, this.getCategorySize(cat)])
      ),
    };
  }
}
