import { bumpSliceVersion, TensorSlice } from "./tensorSlice.ts";

export interface TensorSliceRevision {
  version: number;
  slice: TensorSlice;
}

export class TensorRegistry {
  private readonly current = new Map<string, TensorSlice>();
  private readonly history = new Map<string, TensorSliceRevision[]>();

  register(slice: TensorSlice): TensorSlice {
    this.current.set(slice.entityId, slice);
    this.pushHistory(slice);
    return slice;
  }

  get(entityId: string): TensorSlice | undefined {
    return this.current.get(entityId);
  }

  list(): TensorSlice[] {
    return [...this.current.values()];
  }

  revisions(entityId: string): TensorSliceRevision[] {
    return [...(this.history.get(entityId) ?? [])];
  }

  hotReload(entityId: string, update: (slice: TensorSlice) => TensorSlice): TensorSlice | undefined {
    const existing = this.current.get(entityId);
    if (!existing) {
      return undefined;
    }

    const next = bumpSliceVersion(update(existing));
    this.current.set(entityId, next);
    this.pushHistory(next);
    return next;
  }

  private pushHistory(slice: TensorSlice): void {
    const history = this.history.get(slice.entityId) ?? [];
    history.push({ version: slice.version, slice });
    this.history.set(slice.entityId, history);
  }
}
