"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DifficultyDots } from "@/components/site-ui";
import { LearningStatus } from "@/components/learning-controls";
import { readingLabels, type ReadingStatus } from "@/lib/content-labels";
import { problemHref } from "@/lib/archive-context";
import { keyIdeaLabel, keyIdeaLabels } from "@/lib/key-idea-labels";
import { unpackArchiveRows, type ArchivePacket } from "@/lib/archive-packet";
import {
  archivePage,
  archivePreview,
  difficultyOptions,
  filterArchive,
  PAGE_SIZE,
  readArchiveFilters,
  sortOptions,
  type ArchiveRow,
} from "@/lib/archive";

type Coverage = {
  contest: string;
  count: number;
  years: number[];
  sets: number;
  href: string;
};

/** Keep the displayed page and shareable URL in sync without dropping filters. */
export function canonicalArchivePageSearch(search: string, page: number) {
  const params = new URLSearchParams(search);
  if (page === 1) params.delete("page");
  else params.set("page", String(page));
  return params.toString();
}

const verificationLabels = {
  verified: "Review documented",
  "needs verification": "Further review",
};

function FilterSelect({
  label,
  value,
  options,
  allLabel,
  optionLabels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  allLabel: string;
  optionLabels?: Readonly<Record<string, string>>;
  onChange: (value: string) => void;
}) {
  const optionLabel = (option: string) =>
    optionLabels && Object.prototype.hasOwnProperty.call(optionLabels, option)
      ? optionLabels[option]
      : option;
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-muted">
        {label}
      </span>
      <select
        className="field"
        aria-controls="archive-list"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{allLabel}</option>
        {value && !options.includes(value) ? (
          <option value={value}>
            {optionLabel(value)} (unavailable)
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProblemArchive({
  packet,
  coverage,
  paperLabels = [],
}: {
  packet: ArchivePacket;
  coverage: Coverage[];
  paperLabels?: { id: string; label: string }[];
}) {
  const rows: ArchiveRow[] = useMemo(() => unpackArchiveRows(packet), [packet]);
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const filters = useMemo(
    () => readArchiveFilters(new URLSearchParams(search), rows),
    [search, rows],
  );
  const [searchInput, setSearchInput] = useState(filters.q);
  const [inputSearch, setInputSearch] = useState(search);
  if (inputSearch !== search) {
    setInputSearch(search);
    // An older URL render must not replace text entered since that render.
    if (typeof window === "undefined" || new URLSearchParams(window.location.search).toString() === search) {
      setSearchInput(filters.q);
    }
  }
  const visible = useMemo(() => filterArchive(rows, filters), [rows, filters]);
  const pagination = archivePage(visible, filters.page);
  const canonicalSearch = canonicalArchivePageSearch(search, pagination.page);
  const resultsRef = useRef<HTMLDivElement>(null);
  const focusAfterPageChange = useRef(false);
  useEffect(() => {
    // A newer input event may have changed location since this render.
    if (
      new URLSearchParams(window.location.search).toString() !== search ||
      canonicalSearch === search
    )
      return;
    window.history.replaceState(
      null,
      "",
      `/archive${canonicalSearch ? `?${canonicalSearch}` : ""}${window.location.hash}`,
    );
  }, [search, canonicalSearch]);
  useEffect(() => {
    if (!focusAfterPageChange.current) return;
    focusAfterPageChange.current = false;
    resultsRef.current?.focus();
  }, [search]);
  const scope = useMemo(() => rows.filter(
    (row) => !filters.subject || row.subject === filters.subject,
  ), [rows, filters.subject]);
  const contests = useMemo(() => [...new Set(scope.map(row => row.contest))].sort(), [scope]);
  const subjectIsPlanned = (filters.subject === "Physics" || filters.subject === "CS") && scope.length === 0;
  const contestScope = useMemo(() => scope.filter(
    (row) => !filters.contest || row.contest === filters.contest,
  ), [scope, filters.contest]);
  const { years, topics, ideas } = useMemo(() => ({
    years: [...new Set(contestScope.map(row => String(row.year)))].sort((a, b) => Number(b) - Number(a)),
    topics: [...new Set(contestScope.map(row => row.topic))].sort(),
    ideas: [...new Set(contestScope.flatMap(row => row.keyIdeas))].sort(),
  }), [contestScope]);
  const numbers = useMemo(() => [...new Set(contestScope
    .filter(row => !filters.year || String(row.year) === filters.year)
    .map(row => String(row.problemNumber)))].sort((a, b) => Number(a) - Number(b)), [contestScope, filters.year]);
  const numberLabels = useMemo(() => Object.fromEntries(numbers.map(number => [number, `Problem ${number}`])), [numbers]);
  const selectedPaperLabel = paperLabels.find(paper => paper.id === filters.paper)?.label ?? "Unavailable paper";
  const chips = (
    [
      ["q", filters.q, "Search"],
      ["paper", filters.paper, "Paper", selectedPaperLabel],
      ["subject", filters.subject, "Subject"],
      ["contest", filters.contest, "Contest"],
      ["year", filters.year, "Year"],
      ["number", filters.number, "Problem number", `Problem ${filters.number}`],
      ["topic", filters.topic, "Topic"],
      ["idea", filters.idea, "Key idea", keyIdeaLabel(filters.idea)],
      ["difficulty", filters.difficulty, "Difficulty"],
      [
        "verification",
        filters.verification,
        "Verification",
        verificationLabels[
          filters.verification as keyof typeof verificationLabels
        ],
      ],
      [
        "reading",
        filters.reading,
        "Reading",
        readingLabels[filters.reading as ReadingStatus],
      ],
    ] as [string, string, string, string?][]
  ).filter(([, value]) => value);
  const secondaryFilterCount = [
    filters.subject,
    filters.topic,
    filters.idea,
    filters.difficulty,
    filters.verification,
    filters.reading,
  ].filter(Boolean).length;

  function update(changes: Record<string, string>, replace = false, focusResults = false) {
    if (Object.prototype.hasOwnProperty.call(changes, "q")) setSearchInput(changes.q);
    focusAfterPageChange.current = focusResults;
    // Read the latest location to keep fast input and browser back/forward in sync.
    const params = new URLSearchParams(window.location.search);
    if (params.get("topic") && !filters.topic && filters.idea) {
      params.delete("topic");
      params.set("idea", filters.idea);
    }
    params.delete("page");
    Object.entries(changes).forEach(([key, value]) =>
      value ? params.set(key, value) : params.delete(key),
    );
    const url = `/archive${params.size ? `?${params}` : ""}`;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
  }
  function reset() {
    setSearchInput("");
    focusAfterPageChange.current = true;
    window.history.pushState(null, "", "/archive");
  }
  function goToPage(page: number) {
    update({ page: String(page) }, false, true);
  }

  return (
    <div>
      {/* Readers can open the native disclosure before React hydrates. */}
      <details
        suppressHydrationWarning
        className="mb-6 border-y border-border py-4"
      >
        <summary className="text-sm font-semibold text-navy">
          Browse papers{" "}
          <span className="ml-2 font-normal text-muted">
            {coverage.reduce((total, set) => total + set.sets, 0)} available
          </span>
        </summary>
        <div className="mt-5 space-y-5">
          {coverage.map((set) => (
            <section key={set.contest}>
              <h2 className="mb-3 text-sm font-semibold">
                {set.contest}{" "}
                <span className="ml-2 font-normal text-muted">
                  {set.sets} papers · {set.count} problems
                </span>
              </h2>
              <nav
                aria-label={`${set.contest} papers by year`}
                className="flex flex-wrap gap-2"
              >
                {set.years.map((year) => (
                  <Link
                    key={year}
                    href={`${set.href}&year=${year}`}
                    prefetch={false}
                    className={`inline-flex min-h-11 items-center border px-3 text-sm ${filters.contest === set.contest && filters.year === String(year) ? "border-navy bg-navy text-white" : "border-border bg-paper text-blue hover:border-blue"}`}
                    aria-current={
                      filters.contest === set.contest &&
                      filters.year === String(year)
                        ? "page"
                        : undefined
                    }
                  >
                    {year}
                  </Link>
                ))}
              </nav>
            </section>
          ))}
        </div>
      </details>

      <section aria-label="Filter problems" className="border-y border-border bg-paper px-4 py-5 sm:px-5 sm:py-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="col-span-2 block lg:col-span-1">
            <span className="mb-2 block text-xs font-semibold text-muted">
              Search
            </span>
            <input
              type="search"
              className="field"
              aria-controls="archive-list"
              value={searchInput}
              onChange={(event) => update({ q: event.target.value }, true)}
              placeholder="Topic, idea, or problem number"
            />
          </label>
          <FilterSelect
            label="Contest"
            value={filters.contest}
            options={contests}
            allLabel="All contests"
            onChange={(contest) => update({ contest, year: "", paper: "" })}
          />
          <FilterSelect
            label="Year"
            value={filters.year}
            options={years}
            allLabel="All years"
            onChange={(year) => update({ year, paper: "" })}
          />
        </div>
        <details
          suppressHydrationWarning
          className="mt-5 border-t border-border pt-4"
        >
          <summary className="text-sm font-semibold text-navy">
            More filters
            {secondaryFilterCount > 0 ? (
              <span className="ml-2 font-normal text-muted">
                {secondaryFilterCount} active
              </span>
            ) : null}
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FilterSelect
              label="Subject"
              value={filters.subject}
              options={["Math", "Physics", "CS"]}
              optionLabels={{ Math: "Mathematics", CS: "Computer science" }}
              allLabel="All subjects"
              onChange={(subject) =>
                update({ subject, contest: "", year: "", paper: "", topic: "", idea: "" })
              }
            />
            <FilterSelect
              label="Topic"
              value={filters.topic}
              options={topics}
              allLabel="All topics"
              onChange={(topic) => update({ topic })}
            />
            <FilterSelect
              label="Key idea"
              value={filters.idea}
              options={ideas}
              optionLabels={keyIdeaLabels}
              allLabel="All key ideas"
              onChange={(idea) => update({ idea })}
            />
            <FilterSelect
              label="Difficulty"
              value={filters.difficulty}
              options={difficultyOptions}
              allLabel="All difficulties"
              onChange={(difficulty) => update({ difficulty })}
            />
            <FilterSelect
              label="Verification"
              value={filters.verification}
              options={["verified", "needs verification"]}
              optionLabels={verificationLabels}
              allLabel="All statuses"
              onChange={(verification) => update({ verification })}
            />
            <FilterSelect
              label="Reading"
              value={filters.reading}
              options={Object.keys(readingLabels)}
              optionLabels={readingLabels}
              allLabel="All reading formats"
              onChange={(reading) => update({ reading })}
            />
          </div>
        </details>
        {chips.length ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <span className="mr-1 text-xs text-muted">Active filters</span>
            {chips.map(([key, value, label, display]) => (
              <button
                key={key}
                type="button"
                className="tag min-h-11 gap-2"
                aria-label={`Remove ${label.toLowerCase()} filter: ${display ?? value}`}
                onClick={() =>
                  update({
                    [key]: "",
                    ...(key === "contest" ? { year: "", paper: "" } : {}),
                    ...(key === "year" || key === "subject" ? { paper: "" } : {}),
                  }, false, true)
                }
              >
                <span className="min-w-0 break-words text-left">{display ?? value}</span>
                <span aria-hidden="true" className="shrink-0">×</span>
              </button>
            ))}
            <button
              type="button"
              onClick={reset}
              className="ml-auto min-h-11 text-sm font-semibold text-blue underline"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </section>

      <div className="mb-4 mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(17rem,24rem)] md:items-end">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div ref={resultsRef} id="archive-results" tabIndex={-1} className="scroll-mt-28 rounded-sm">
          <h2 className="font-display text-2xl text-navy">
            {filters.paper ? selectedPaperLabel : filters.contest && filters.year
              ? `${filters.year} ${filters.contest}`
              : "Problems"}
          </h2>
          <p
            className="mt-1 text-sm text-muted"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {visible.length
              ? `${(pagination.page - 1) * PAGE_SIZE + 1}–${Math.min(pagination.page * PAGE_SIZE, visible.length)} of ${visible.length.toLocaleString("en-US")} results`
              : "0 results"}
            {chips.length
              ? ` · ${rows.length.toLocaleString("en-US")} in the archive`
              : ""}
          </p>
        </div>
          <Link prefetch={false} href="/my-learning" className="text-link inline-flex min-h-11 items-center text-sm">
            My Learning →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FilterSelect
            label="Problem number"
            value={filters.number}
            options={numbers}
            optionLabels={numberLabels}
            allLabel="All numbers"
            onChange={(number) => update({ number })}
          />
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-muted">Sort by</span>
            <select
              value={filters.sort}
              className="field"
              aria-controls="archive-list"
              onChange={(event) => update({ sort: event.target.value })}
            >
              {sortOptions.map((option) => (
                <option key={option} value={option}>{option === "Problem Number" ? "Problem no." : option}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div id="archive-list" className="divide-y divide-border border-y border-border bg-paper">
        {pagination.rows.map((problem) => {
          const preview = archivePreview(problem);
          return (
          <article
            key={problem.id}
            id={`problem-${problem.id}`}
            className="group grid scroll-mt-28 gap-3 px-4 py-5 sm:grid-cols-[minmax(0,1fr)_170px] sm:gap-8 sm:px-5"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{problem.contest}</span>
                <span aria-hidden="true">/</span>
                <span>{problem.year}</span>
                <span aria-hidden="true">/</span>
                <span>Problem {problem.problemNumber}</span>
              </div>
              <h3 className="mt-1">
                <Link
                  href={problemHref(
                    problem.slug,
                    `/archive${canonicalSearch ? `?${canonicalSearch}` : ""}#problem-${problem.id}`,
                  )}
                  prefetch={false}
                  className="font-display text-xl text-navy hover:text-blue hover:underline"
                >
                  {problem.title}
                </Link>
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                {preview}
                {preview.length === 150 ? "…" : ""}
              </p>
              <div className="mt-2">
                <LearningStatus problemId={problem.id} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:block sm:space-y-2">
              <Link
                href={`/archive?topic=${encodeURIComponent(problem.topic)}`}
                prefetch={false}
                className="text-link"
              >
                {problem.topic}
              </Link>
              <p className="flex items-center gap-2 text-muted">
                <DifficultyDots difficulty={problem.difficulty} />
                {problem.difficulty}
              </p>
              <p className="text-muted">
                {problem.reviewLabel ?? verificationLabels[problem.verificationStatus]}
              </p>
              <p className="font-medium text-navy">
                {problem.readingStatus
                  ? readingLabels[problem.readingStatus]
                  : problem.problemTextStatus === "linked-only"
                    ? "Statement at source"
                    : "Read here"}
              </p>
              <a
                href={problem.officialSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue underline"
                aria-label={`Contest reference for ${problem.title}: ${problem.officialSourceName}`}
              >
                Contest reference <span aria-hidden="true">↗</span>
              </a>
            </div>
          </article>
          );
        })}
        {!visible.length ? (
          <section className="px-6 py-12 text-center">
            <p className="eyebrow">
              {subjectIsPlanned
                ? "Collection planned"
                : "Try a broader search"}
            </p>
            <h3 className="font-display mt-3 text-2xl">
              {subjectIsPlanned
                ? "This subject is not in the archive yet."
                : "No problems match these filters."}
            </h3>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted">
              {subjectIsPlanned
                ? `${filters.subject === "CS" ? "Computer science" : "Physics"} resources are planned. Browse the available ${coverage.map((item) => item.contest).join(", ")} papers.`
                : "Remove a filter or try another search term. You can also choose a paper from the contest and year browser above."}
            </p>
            <button
              type="button"
              className="button-primary mt-5"
              onClick={reset}
            >
              Browse all problems
            </button>
          </section>
        ) : null}
      </div>

      {visible.length > PAGE_SIZE ? (
        <nav
          aria-label="Problem result pages"
          className="mt-5 flex items-center justify-between gap-3"
        >
          <button
            type="button"
            className="button-secondary"
            disabled={pagination.page === 1}
            onClick={() => goToPage(pagination.page - 1)}
          >
            ← Previous
          </button>
          <p className="text-xs text-muted">
            Page {pagination.page} of {pagination.pages}
          </p>
          <button
            type="button"
            className="button-secondary"
            disabled={pagination.page === pagination.pages}
            onClick={() => goToPage(pagination.page + 1)}
          >
            Next →
          </button>
        </nav>
      ) : null}
      <p className="mt-7 text-xs leading-6 text-muted">
        Difficulty labels are Novaris study guidance. Verification records refer
        to source and answer checks.{" "}
        <Link prefetch={false} href="/source-policy" className="text-link">
          Read the source policy.
        </Link>
      </p>
    </div>
  );
}
