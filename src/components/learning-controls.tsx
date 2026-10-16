"use client";

import { EMPTY_LEARNING_RECORD, learningFields, type LearningField } from "@/lib/learning";
import { useLearning } from "@/lib/learning-store";

const labels: Record<LearningField, [string, string]> = {
  saved: ["Save", "Saved"],
  review: ["Review later", "For review"],
  completed: ["Mark completed", "Completed"],
};

export function LearningStorageNotice() {
  const { persistence, issue } = useLearning();
  if (persistence !== "session") return null;
  return (
    <p role="status" className="mt-3 border-l-2 border-gold pl-3 text-xs leading-5 text-muted">
      {issue === "invalid-data" || issue === "unsupported-version"
        ? "Your existing saved data could not be read safely and has been left unchanged. New changes are kept only in this tab."
        : "This browser could not save your changes. They are kept only in this tab and may be lost when it closes or reloads."}
    </p>
  );
}

export function LearningControls({
  problemId, compact = false, problemTitle, showStorageNotice = !compact, onAction,
}: {
  problemId: string;
  compact?: boolean;
  problemTitle?: string;
  showStorageNotice?: boolean;
  onAction?: (field: LearningField, nextValue: boolean) => void;
}) {
  const { state, hydrated, set } = useLearning();
  const record = state.records[problemId] ?? EMPTY_LEARNING_RECORD;
  return (
    <div className="no-print">
      <div role="group" aria-label={`${problemTitle ?? "Problem"} learning actions`} className={compact ? "grid grid-cols-3 gap-2" : "flex flex-wrap gap-2"}>
        {learningFields.map(field => {
          const label = compact && !record[field]
            ? { saved: "Save", review: "Review", completed: "Complete" }[field]
            : labels[field][record[field] ? 1 : 0];
          return (
          <button
            type="button"
            key={field}
            aria-pressed={record[field]}
            disabled={!hydrated}
            onClick={() => {
              onAction?.(field, !record[field]);
              set(problemId, field, !record[field]);
            }}
            aria-label={`${label}: ${problemTitle ?? "this problem"}`}
            className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-sm border py-2 font-semibold ${compact ? "px-2 text-xs" : "px-3 text-sm"} ${record[field] ? "border-blue bg-soft-blue text-blue" : "border-border bg-paper text-muted hover:border-blue hover:text-blue"}`}
          >
            {record[field] ? <span aria-hidden="true">✓</span> : null}
            {label}
          </button>
          );
        })}
      </div>
      {showStorageNotice ? <LearningStorageNotice /> : null}
    </div>
  );
}

export function LearningStatus({ problemId }: { problemId: string }) {
  const { state, hydrated } = useLearning();
  const record = state.records[problemId];
  if (!hydrated || !record) return null;
  return (
    <span className="inline-flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-blue">
      {learningFields.filter(field => record[field]).map(field => <span key={field}>{labels[field][1]}</span>)}
    </span>
  );
}

export function PaperLearningProgress({ problemIds }: { problemIds: string[] }) {
  const { state, hydrated } = useLearning();
  const ids = [...new Set(problemIds)];
  if (!ids.length) return null;
  const completed = ids.filter(id => state.records[id]?.completed).length;
  return (
    <div className="no-print mt-4 border-t border-border pt-4 text-sm text-muted" aria-live="polite">
      {hydrated ? (
        <>
          <p><span className="font-semibold text-navy">{completed} of {ids.length}</span> marked completed</p>
          <progress aria-label="Problems marked completed in this paper" className="mt-2 h-1.5 w-full accent-blue" value={completed} max={ids.length} />
        </>
      ) : <p>Loading your paper progress…</p>}
    </div>
  );
}
