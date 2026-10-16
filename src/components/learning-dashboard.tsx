"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LearningControls, LearningStorageNotice } from "@/components/learning-controls";
import { problemHref } from "@/lib/archive-context";
import {
  LEARNING_PAGE_SIZE, learningCounts, learningPage, selectLearningRows,
  type LearningField, type LearningItem, type LearningView,
} from "@/lib/learning";
import { useLearning } from "@/lib/learning-store";

const views: { value: LearningView; label: string; empty: string }[] = [
  { value: "all", label: "All activity", empty: "Your practice list starts with a problem." },
  { value: "saved", label: "Saved", empty: "No saved problems yet." },
  { value: "review", label: "To review", empty: "Your review list is clear." },
  { value: "completed", label: "Completed", empty: "No problems marked completed yet." },
];

export function LearningDashboard({ items }: { items: LearningItem[] }) {
  const params = useSearchParams();
  const search = params.toString();
  const view = views.find(item => item.value === params.get("view")) ?? views[0];
  const query = params.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(query);
  const [inputSearch, setInputSearch] = useState(search);
  if (inputSearch !== search) {
    setInputSearch(search);
    if (typeof window === "undefined" || new URLSearchParams(window.location.search).toString() === search) {
      setSearchInput(query);
    }
  }
  const contest = params.get("contest") ?? "";
  const { state, hydrated, persistence } = useLearning();
  const counts = useMemo(() => learningCounts(items, state), [items, state]);
  const rows = useMemo(() => selectLearningRows(items, state, { view: view.value, query, contest }), [items, state, view.value, query, contest]);
  const pagination = learningPage(rows, Number(params.get("page") ?? 1));
  const contests = useMemo(() => [...new Set(items.filter(item => state.records[item.id]).map(item => item.contest))].sort(), [items, state]);
  const resultsRef = useRef<HTMLElement>(null);
  const pendingRowFocus = useRef<{ id: string; index: number } | null>(null);
  const pendingPageFocus = useRef(false);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    const pending = pendingRowFocus.current;
    if (!pending) return;
    pendingRowFocus.current = null;
    if (pagination.rows.some(item => item.id === pending.id)) return;
    const nextItem = pagination.rows[Math.min(pending.index, pagination.rows.length - 1)];
    const nextLink = nextItem ? document.getElementById(`learning-link-${nextItem.id}`) : null;
    (nextLink ?? resultsRef.current)?.focus();
  }, [state, pagination.rows]);
  useEffect(() => {
    if (!pendingPageFocus.current) return;
    pendingPageFocus.current = false;
    resultsRef.current?.focus();
  }, [search]);

  // Removing the last item on a page also corrects its URL, so returning to the
  // list cannot leave a stale, out-of-range page in browser history.
  useEffect(() => {
    if (!hydrated) return;
    const next = new URLSearchParams(search);
    if (!next.has("page") || next.get("page") === String(pagination.page)) return;
    if (new URLSearchParams(window.location.search).toString() !== search) return;
    if (pagination.page > 1) next.set("page", String(pagination.page));
    else next.delete("page");
    window.history.replaceState(null, "", `/my-learning${next.size ? `?${next}` : ""}${window.location.hash}`);
  }, [hydrated, pagination.page, search]);

  function update(changes: Record<string, string>, replace = false, focusResults = false) {
    if (Object.prototype.hasOwnProperty.call(changes, "q")) setSearchInput(changes.q);
    pendingPageFocus.current = focusResults;
    const next = new URLSearchParams(window.location.search);
    next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const url = `/my-learning${next.size ? `?${next}` : ""}`;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  }
  function rowAction(item: LearningItem, field: LearningField, value: boolean) {
    pendingRowFocus.current = { id: item.id, index: pagination.rows.findIndex(row => row.id === item.id) };
    const label = field === "saved" ? "saved problems" : field === "review" ? "the review list" : "completed problems";
    setActionMessage(`${item.title} ${value ? "added to" : "removed from"} ${label}.`);
  }
  function returnPath(id: string) {
    const next = new URLSearchParams(search);
    if (pagination.page > 1) next.set("page", String(pagination.page));
    else next.delete("page");
    return `/my-learning${next.size ? `?${next}` : ""}#problem-${id}`;
  }

  if (!hydrated) return <p role="status" className="border-t border-border py-8 text-muted">Loading learning activity saved in this browser…</p>;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-muted">
        <p>{persistence === "persistent" ? "Stored in this browser" : "Current tab only"} · No account or cross-device sync</p>
        <Link prefetch={false} href="/archive" className="text-link">Browse the archive →</Link>
      </div>
      <LearningStorageNotice />
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{actionMessage}</p>
      <nav aria-label="Learning lists" className="mt-5 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4">
        {views.map(item => (
          <button
            key={item.value}
            type="button"
            aria-pressed={item.value === view.value}
            aria-controls="learning-results"
            onClick={() => update({ view: item.value === "all" ? "" : item.value })}
            className={`flex min-h-14 items-center justify-between gap-3 border-l-2 px-4 py-3 text-left text-sm ${item.value === view.value ? "border-navy bg-soft-blue font-semibold text-navy" : "border-transparent bg-paper text-muted hover:text-blue"}`}
          >
            {item.label} <span className="text-base tabular-nums">{counts[item.value]}</span>
          </button>
        ))}
      </nav>
      <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)]">
        <label>
          <span className="mb-2 block text-xs font-semibold text-muted">Search your list</span>
          <input type="search" className="field" aria-controls="learning-results" placeholder="Contest, year, problem or topic" value={searchInput} onChange={event => update({ q: event.target.value }, true)} />
        </label>
        <label>
          <span className="mb-2 block text-xs font-semibold text-muted">Contest</span>
          <select className="field" aria-controls="learning-results" value={contest} onChange={event => update({ contest: event.target.value })}>
            <option value="">All contests</option>
            {contest && !contests.includes(contest) ? <option value={contest}>{contest}</option> : null}
            {contests.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
      </div>
      <section ref={resultsRef} id="learning-results" tabIndex={-1} className="mt-7 scroll-mt-24 rounded-sm" aria-label={`${view.label} problems`}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl text-navy">{view.label}</h2>
          <p role="status" aria-atomic="true" className="text-xs text-muted">
            {rows.length ? `${(pagination.page - 1) * LEARNING_PAGE_SIZE + 1}–${Math.min(pagination.page * LEARNING_PAGE_SIZE, rows.length)} of ${rows.length} problems` : "0 problems"}
          </p>
        </div>
        {rows.length > 1 ? <p className="mb-3 text-xs text-muted">Most recently updated first</p> : null}
        {rows.length ? (
          <ol className="divide-y divide-border border-y border-border">
            {pagination.rows.map(item => (
              <li key={item.id} id={`problem-${item.id}`} className="scroll-mt-24 py-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0">
                    <p className="mb-1 text-xs text-muted">{item.contest} · {item.year} · Problem {item.problemNumber}</p>
                    <Link prefetch={false} id={`learning-link-${item.id}`} href={problemHref(item.slug, returnPath(item.id))} className="font-display text-xl text-navy hover:text-blue hover:underline">{item.title}</Link>
                    <p className="mt-1 text-xs text-muted">{item.topic} · {item.difficulty}</p>
                  </div>
                  <div className="w-full shrink-0 sm:max-w-sm lg:w-80"><LearningControls problemId={item.id} problemTitle={item.title} compact onAction={(field, value) => rowAction(item, field, value)} /></div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="border-y border-border py-10">
            <h3 className="font-display text-2xl text-navy">{query || contest ? "No problems match these filters." : view.empty}</h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              {query || contest ? "Try another search or clear the filters to see the rest of your list." : "Open a problem to save it, queue it for review, or mark it completed. These choices are independent; reading a solution does not mark a problem completed."}
            </p>
            {query || contest ? <button type="button" className="button-secondary mt-5" onClick={() => update({ q: "", contest: "" }, false, true)}>Clear filters</button> : <Link prefetch={false} href="/archive" className="button-primary mt-5">Find a problem</Link>}
          </div>
        )}
        {pagination.pages > 1 ? (
          <nav aria-label="Learning list pages" className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button type="button" disabled={pagination.page === 1} onClick={() => update({ page: String(pagination.page - 1) }, false, true)} className="button-secondary">← Previous</button>
            <span className="text-sm text-muted">Page {pagination.page} of {pagination.pages}</span>
            <button type="button" disabled={pagination.page === pagination.pages} onClick={() => update({ page: String(pagination.page + 1) }, false, true)} className="button-secondary">Next →</button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
