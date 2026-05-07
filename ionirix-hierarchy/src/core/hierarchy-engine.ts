import config from "../../hierarchy.config.json" with { type: "json" };
import { CrossPointBus } from "../integrations/cross-point-bus.js";
import { createDefaultLifecycleHooks } from "../integrations/lifecycle-hooks.js";
import { HierarchyValidator } from "../integrations/hierarchy-validator.js";
import {
  EngineExecutionRequest,
  EngineExecutionResponse,
  HierarchyConfig,
  ModuleManifest,
  RuntimeState
} from "./types.js";
import { PointRegistry } from "./point-registry.js";

export class HierarchyEngine {
  private readonly typedConfig = config as HierarchyConfig;
  private readonly bus = new CrossPointBus(this.typedConfig.busTopology);
  private readonly hooks = createDefaultLifecycleHooks();
  private readonly registry = new PointRegistry(this.typedConfig, this.bus, this.hooks);
  private readonly state: RuntimeState = { initialized: false };

  initialize(): void {
    this.state.initialized = true;
  }

  async registerModules(modules: ModuleManifest[]): Promise<void> {
    if (!this.state.initialized) {
      throw new Error("Hierarchy engine must be initialized before registration.");
    }

    for (const moduleManifest of modules) {
      await this.registry.register(moduleManifest);
    }
  }

  async execute(request: EngineExecutionRequest): Promise<EngineExecutionResponse> {
    const manifest = this.registry.getManifest(request.pointId);
    const feature = manifest.features.find((entry) => entry.id === request.featureId);

    if (!feature) {
      throw new Error(`Feature ${request.featureId} is not registered under ${request.pointId}`);
    }

    await this.hooks.emit({
      phase: "pre-execute",
      pointId: request.pointId,
      featureId: request.featureId,
      timestamp: new Date().toISOString()
    });

    const result = await feature.execute({
      featureId: request.featureId,
      pointId: request.pointId,
      payload: request.payload,
      timestamp: new Date().toISOString()
    });

    const event = this.bus.emit({
      type: feature.eventType,
      sourcePoint: request.pointId,
      payload: request.payload,
      timestamp: new Date().toISOString()
    });

    await this.hooks.emit({
      phase: "post-execute",
      pointId: request.pointId,
      featureId: request.featureId,
      timestamp: new Date().toISOString()
    });

    return { event, result };
  }

  audit(workspaceRoot: string): string {
    const validator = new HierarchyValidator(this.typedConfig, this.registry.getAll(), workspaceRoot);
    const report = validator.buildAuditReport();
    this.state.lastAudit = report;
    return validator.formatAuditReport();
  }

  getConfig(): HierarchyConfig {
    return this.typedConfig;
  }

  getRegistry(): PointRegistry {
    return this.registry;
  }

  getLifecycleHistory() {
    return this.hooks.getHistory();
  }
}

export const hierarchyEngine = new HierarchyEngine();