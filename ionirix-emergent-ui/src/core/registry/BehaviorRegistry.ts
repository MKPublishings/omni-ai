import type { Behavior, BehaviorContext } from '@/types';

type BehaviorRegistryListener = () => void;

export class BehaviorRegistry {
  private static instance: BehaviorRegistry;
  private behaviors = new Map<string, Behavior>();
  private activeSet = new Set<string>();
  private listeners = new Set<BehaviorRegistryListener>();
  private activeCache: Behavior[] = [];

  private constructor() {}

  static getInstance(): BehaviorRegistry {
    if (!BehaviorRegistry.instance) {
      BehaviorRegistry.instance = new BehaviorRegistry();
    }

    return BehaviorRegistry.instance;
  }

  register(id: string, behavior: Behavior): void {
    if (this.behaviors.has(id)) {
      console.warn(`[BehaviorRegistry] Overwriting behavior: ${id}`);
    }

    this.behaviors.set(id, behavior);
    this.refreshActiveCache();
    this.notifyListeners();
  }

  resolve(id: string): Behavior | undefined {
    return this.behaviors.get(id);
  }

  getActive(): Behavior[] {
    return this.activeCache;
  }

  evaluate(context: BehaviorContext): Behavior[] {
    const activated: Behavior[] = [];
    let changed = false;

    for (const [id, behavior] of this.behaviors) {
      const shouldActivate = behavior.evaluate(context);

      if (shouldActivate && !this.activeSet.has(id)) {
        this.activeSet.add(id);
        activated.push(behavior);
        changed = true;
      } else if (!shouldActivate && this.activeSet.has(id)) {
        this.activeSet.delete(id);
        behavior.cleanup?.(id);
        changed = true;
      }
    }

    if (changed) {
      this.refreshActiveCache();
      this.notifyListeners();
    }

    return activated;
  }

  getRegisteredIds(): string[] {
    return Array.from(this.behaviors.keys());
  }

  reset(): void {
    for (const id of this.activeSet) {
      this.behaviors.get(id)?.cleanup?.(id);
    }

    this.activeSet.clear();
    this.refreshActiveCache();
    this.notifyListeners();
  }

  subscribe(listener: BehaviorRegistryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  private refreshActiveCache(): void {
    this.activeCache = Array.from(this.activeSet)
      .map((id) => this.behaviors.get(id))
      .filter((behavior): behavior is Behavior => behavior !== undefined)
      .sort((left, right) => right.priority - left.priority);
  }
}