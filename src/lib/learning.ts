/** Versioned, browser-independent learning data. Problem IDs remain the archive IDs. */
export const LEARNING_STORAGE_KEY = "novaris.learning.v1";
export const LEARNING_PAGE_SIZE = 25;
export const learningFields = ["saved", "review", "completed"] as const;
export type LearningField = (typeof learningFields)[number];
export type LearningView = "all" | LearningField;
export type LearningRecord = Record<LearningField, boolean> & { updatedAt: number };
export type LearningState = { version: 1; records: Record<string, LearningRecord> };
export type LearningItem = {
  id: string;
  slug: string;
  title: string;
  contest: string;
  year: number;
  problemNumber: number;
  topic: string;
  difficulty: string;
};
export const EMPTY_LEARNING_STATE: LearningState = Object.freeze({
  version: 1,
  records: Object.freeze({}),
});
export const EMPTY_LEARNING_RECORD: LearningRecord = Object.freeze({
  saved: false, review: false, completed: false, updatedAt: 0,
});

export function isLearningId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9-]{0,127}$/i.test(value) &&
    !["constructor", "prototype", "__proto__"].includes(value);
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function parseLearning(raw: string | null): {
  state: LearningState; issue: "invalid-data" | "unsupported-version" | null;
} {
  if (raw === null) return { state: EMPTY_LEARNING_STATE, issue: null };
  try {
    if (raw.length > 2_000_000) throw new Error("Learning data is too large");
    const data: unknown = JSON.parse(raw);
    if (!object(data)) throw new Error("Expected an object");
    if (data.version !== 1) return { state: EMPTY_LEARNING_STATE, issue: "unsupported-version" };
    if (!object(data.records) || Object.keys(data.records).length > 10_000) throw new Error("Invalid records");
    const records: Record<string, LearningRecord> = {};
    let issue: "invalid-data" | null = null;
    for (const [id, row] of Object.entries(data.records)) {
      if (!isLearningId(id) || !object(row) ||
        !learningFields.every(field => typeof row[field] === "boolean") ||
        typeof row.updatedAt !== "number" || !Number.isSafeInteger(row.updatedAt) || row.updatedAt < 0) {
        issue = "invalid-data";
        continue;
      }
      if (learningFields.some(field => row[field])) records[id] = {
        saved: row.saved as boolean, review: row.review as boolean,
        completed: row.completed as boolean, updatedAt: row.updatedAt,
      };
    }
    return { state: { version: 1, records }, issue };
  } catch { return { state: EMPTY_LEARNING_STATE, issue: "invalid-data" }; }
}

export function setLearningFlag(
  state: LearningState, problemId: string, field: LearningField, value: boolean,
  updatedAt = Date.now(),
): LearningState {
  if (!isLearningId(problemId) || !learningFields.includes(field) || typeof value !== "boolean") return state;
  const before = state.records[problemId] ?? EMPTY_LEARNING_RECORD;
  if (before[field] === value) return state;
  const next = { ...before, [field]: value, updatedAt };
  const records = { ...state.records };
  if (learningFields.some(key => next[key])) records[problemId] = next;
  else delete records[problemId];
  return { version: 1, records };
}

export function learningCounts(items: readonly Pick<LearningItem, "id">[], state: LearningState) {
  const counts = { all: 0, saved: 0, review: 0, completed: 0 };
  for (const item of items) {
    const record = state.records[item.id];
    if (!record) continue;
    if (learningFields.some(field => record[field])) counts.all++;
    for (const field of learningFields) if (record[field]) counts[field]++;
  }
  return counts;
}
export function selectLearningRows<T extends LearningItem>(
  items: readonly T[], state: LearningState,
  filters: { view?: LearningView; query?: string; contest?: string } = {},
): T[] {
  const words = (filters.query ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items.filter(item => {
    const record = state.records[item.id];
    if (!record || !(filters.view && filters.view !== "all" ? record[filters.view] : learningFields.some(field => record[field]))) return false;
    if (filters.contest && filters.contest !== item.contest) return false;
    const text = [item.title, item.contest, item.year, item.problemNumber, item.topic].join(" ").toLowerCase();
    return words.every(word => text.includes(word));
  }).sort((a, b) => state.records[b.id].updatedAt - state.records[a.id].updatedAt || a.id.localeCompare(b.id));
}
export function learningPage<T>(rows: readonly T[], requestedPage: number) {
  const pages = Math.max(1, Math.ceil(rows.length / LEARNING_PAGE_SIZE));
  const page = Math.min(Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1, pages);
  return { page, pages, rows: rows.slice((page - 1) * LEARNING_PAGE_SIZE, page * LEARNING_PAGE_SIZE) };
}
