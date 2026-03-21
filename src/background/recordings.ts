import type { RecordingEntry } from "../shared/recording";

export type RecordingSnapshot = {
  activeTargetIds: string[];
  entriesByTarget: Record<string, RecordingEntry[]>;
};

export class RecordingStore {
  private activeTargets = new Set<string>();
  private entries = new Map<string, RecordingEntry[]>();

  start(targetId: string) {
    this.activeTargets.add(targetId);
    this.entries.set(targetId, []);
  }

  stop(targetId: string) {
    this.activeTargets.delete(targetId);
  }

  add(targetId: string, entry: RecordingEntry) {
    if (!this.activeTargets.has(targetId)) {
      return;
    }

    const currentEntries = this.entries.get(targetId) ?? [];
    currentEntries.push(entry);
    this.entries.set(targetId, currentEntries);
  }

  get(targetId: string): RecordingEntry[] {
    return this.entries.get(targetId) ?? [];
  }

  isActive(targetId: string): boolean {
    return this.activeTargets.has(targetId);
  }

  clear(targetId: string) {
    this.entries.set(targetId, []);
    this.activeTargets.delete(targetId);
  }

  snapshot(): RecordingSnapshot {
    return {
      activeTargetIds: [...this.activeTargets],
      entriesByTarget: Object.fromEntries(this.entries.entries())
    };
  }

  static fromSnapshot(snapshot?: RecordingSnapshot | null): RecordingStore {
    const store = new RecordingStore();
    if (!snapshot) {
      return store;
    }

    store.activeTargets = new Set(snapshot.activeTargetIds);
    store.entries = new Map(Object.entries(snapshot.entriesByTarget));
    return store;
  }
}
