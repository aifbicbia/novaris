import {
  EMPTY_LEARNING_RECORD, EMPTY_LEARNING_STATE, LEARNING_STORAGE_KEY,
  isLearningId, learningFields, parseLearning, setLearningFlag,
  type LearningField, type LearningState,
} from "./learning";

type StoragePort = { getItem(key: string): string | null; setItem(key: string, value: string): void };
export type LearningSnapshot = {
  state: LearningState;
  hydrated: boolean;
  persistence: "loading" | "persistent" | "session";
  issue: "unavailable" | "write-failed" | "invalid-data" | "unsupported-version" | null;
};
const SERVER_SNAPSHOT: LearningSnapshot = {
  state: EMPTY_LEARNING_STATE, hydrated: false, persistence: "loading", issue: null,
};
type Pending = { problemId: string; field: LearningField; value: boolean; updatedAt: number };

/** Storage is injected so denied access, quota failures and cross-tab changes are testable. */
export function createLearningStore(options: {
  getStorage: () => StoragePort;
  listen?: (onStorageChange: () => void) => () => void;
  now?: () => number;
}) {
  let snapshot = SERVER_SNAPSHOT;
  const listeners = new Set<() => void>();
  const pending = new Map<string, Pending>();
  let unlisten: (() => void) | undefined;
  const now = options.now ?? Date.now;
  function notify(next: LearningSnapshot) {
    snapshot = next;
    listeners.forEach(listener => listener());
  }
  function overlay(state: LearningState) {
    for (const change of pending.values()) state = setLearningFlag(state, change.problemId, change.field, change.value, change.updatedAt);
    return state;
  }
  function read() {
    try {
      const storage = options.getStorage();
      return { ...parseLearning(storage.getItem(LEARNING_STORAGE_KEY)), storage };
    } catch { return { state: snapshot.state, issue: "unavailable" as const, storage: null }; }
  }
  function refresh() {
    const result = read();
    // A corrupt external write must not clear the usable state already in memory.
    const base = result.issue && snapshot.hydrated ? snapshot.state : result.state;
    notify({ state: overlay(base), hydrated: true,
      persistence: result.issue || pending.size ? "session" : "persistent",
      issue: result.issue ?? (pending.size ? "write-failed" : null),
    });
  }
  function update(problemId: string, field: LearningField, value?: boolean) {
    if (!isLearningId(problemId) || !learningFields.includes(field)) return;
    const latest = read();
    const base = overlay(latest.issue && snapshot.hydrated ? snapshot.state : latest.state);
    const before = base.records[problemId] ?? EMPTY_LEARNING_RECORD;
    const chosen = value ?? !before[field];
    const updatedAt = now();
    const state = setLearningFlag(base, problemId, field, chosen, updatedAt);
    pending.set(`${problemId}:${field}`, { problemId, field, value: chosen, updatedAt });
    // Never replace malformed or newer-version data with a guessed migration.
    if (latest.issue || !latest.storage) {
      notify({ state, hydrated: true, persistence: "session", issue: latest.issue });
      return;
    }
    try {
      latest.storage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(state));
      pending.clear();
      notify({ state, hydrated: true, persistence: "persistent", issue: null });
    } catch { notify({ state, hydrated: true, persistence: "session", issue: "write-failed" }); }
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => SERVER_SNAPSHOT,
    subscribe(listener: () => void) {
      const first = listeners.size === 0;
      listeners.add(listener);
      if (first) {
        unlisten = options.listen?.(refresh);
        refresh();
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) { unlisten?.(); unlisten = undefined; }
      };
    },
    toggle: (problemId: string, field: LearningField) => update(problemId, field),
    set: (problemId: string, field: LearningField, value: boolean) => update(problemId, field, value),
  };
}
