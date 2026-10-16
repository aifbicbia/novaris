"use client";

import { useSyncExternalStore } from "react";
import { LEARNING_STORAGE_KEY } from "./learning";
import { createLearningStore } from "./learning-persistence";

// The callbacks touch window only when a client subscribes or performs an action.
const store = createLearningStore({
  getStorage: () => window.localStorage,
  listen: refresh => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === LEARNING_STORAGE_KEY || event.key === null) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  },
});
export function useLearning() {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { ...snapshot, toggle: store.toggle, set: store.set };
}
