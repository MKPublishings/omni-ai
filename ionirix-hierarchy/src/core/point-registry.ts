import { CrossPointBus } from "../integrations/cross-point-bus.js";
import { LifecycleHooks } from "../integrations/lifecycle-hooks.js";
import {
  HierarchyConfig,
  ModuleManifest,
  PointId,
  RegistrySnapshot,
  ValidationResult
} from "./types.js";
import { validateManifestAgainstConfig } from "./validation.js";

export class PointRegistry {
  private readonly manifests = new Map<PointId, ModuleManifest>();

  constructor(
    private readonly config: HierarchyConfig,
    private readonly bus: CrossPointBus,
    private readonly hooks: LifecycleHooks
  ) {}

  async register(manifest: ModuleManifest): Promise<void> {
    await this.hooks.emit({
      phase: "pre-register",
      pointId: manifest.pointId,
      timestamp: new Date().toISOString()
    });

    const result = validateManifestAgainstConfig(manifest, this.config);
    if (!result.summary.passed) {
      throw new Error(result.violations.map((violation) => violation.message).join("; "));
    }

    for (const eventType of manifest.allowedSubscriptions) {
      this.bus.subscribe({
        pointId: manifest.pointId,
        eventType,
        handlerName: `${manifest.pointId.toLowerCase()}-subscription`
      });
    }

    this.manifests.set(manifest.pointId, manifest);

    await this.hooks.emit({
      phase: "post-register",
      pointId: manifest.pointId,
      timestamp: new Date().toISOString()
    });
  }

  getManifest(pointId: PointId): ModuleManifest {
    const manifest = this.manifests.get(pointId);
    if (!manifest) {
      throw new Error(`Point not registered: ${pointId}`);
    }
    return manifest;
  }

  getAll(): ModuleManifest[] {
    return [...this.manifests.values()].sort((left, right) => right.pointId.localeCompare(left.pointId));
  }

  snapshot(): RegistrySnapshot {
    return {
      registeredPoints: [...this.manifests.keys()],
      manifests: this.getAll()
    };
  }

  validate(manifest: ModuleManifest): ValidationResult {
    return validateManifestAgainstConfig(manifest, this.config);
  }
}