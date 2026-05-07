import { LifecycleEvent, LifecycleHook } from "../core/types.js";

export class LifecycleHooks {
  private readonly hooks: LifecycleHook[] = [];
  private readonly history: LifecycleEvent[] = [];

  addHook(hook: LifecycleHook): void {
    this.hooks.push(hook);
  }

  async emit(event: LifecycleEvent): Promise<void> {
    this.history.push(event);
    for (const hook of this.hooks) {
      await hook.run(event);
    }
  }

  getHistory(): LifecycleEvent[] {
    return [...this.history];
  }
}

export function createDefaultLifecycleHooks(): LifecycleHooks {
  const hooks = new LifecycleHooks();
  hooks.addHook({
    id: "timeline-recorder",
    run: () => undefined
  });
  return hooks;
}