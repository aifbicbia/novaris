import type {
  Difficulty,
  ProblemTextStatus,
  Subject,
  VerificationStatus,
} from "../data/schema";
import type { ReadingStatus } from './content-labels';
import { keyIdeaLabel } from './key-idea-labels';

/** Lightweight view model. Solution bodies stay on the server; searchText is a compact statement token index. */
export type ArchiveRow = {
  id: string;
  /** Actual published paper identity for historical IDs without a -p suffix. */
  paperId?: string;
  slug: string;
  title: string;
  subject: Subject;
  contest: string;
  year: number;
  problemNumber: number;
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  verificationStatus: VerificationStatus;
  problemTextStatus: ProblemTextStatus;
  officialSourceName: string;
  officialSourceUrl: string;
  preview?: string;
  searchText: string;
  keyIdeas: string[];
  readingStatus?: ReadingStatus;
  reviewLabel?: string;
};
/** Exact display fallback for rows whose source notice is derived, not transferred. */
export function archivePreview(row: Pick<ArchiveRow, "preview" | "subtopic">) {
  const label = keyIdeaLabel(row.subtopic);
  return row.preview ?? `${label}${/[.!?]$/.test(label) ? "" : "."} Read the original at the source, then study the Novaris solution here.`;
}

export type ArchiveFilters = {
  q: string;
  paper: string;
  number: string;
  reading: string;
  subject: string;
  contest: string;
  year: string;
  topic: string;
  idea: string;
  difficulty: string;
  verification: string;
  sort: string;
  page: number;
};
export const difficultyOptions = [
  "Introductory",
  "Intermediate",
  "Advanced",
  "Olympiad",
];
export const sortOptions = [
  "Newest",
  "Oldest",
  "Problem Number",
  "Difficulty",
  "Topic",
];
export const PAGE_SIZE = 25;
const difficultyRank: Record<Difficulty, number> = {
  Introductory: 1,
  Intermediate: 2,
  Advanced: 3,
  Olympiad: 4,
};

export function readArchiveFilters(
  params: URLSearchParams,
  rows: ArchiveRow[],
): ArchiveFilters {
  let topic = params.get("topic") ?? "";
  let idea = params.get("idea") ?? "";
  // Older detail pages linked key ideas with ?topic=. Keep those links useful.
  if (
    topic &&
    !rows.some((row) => row.topic === topic) &&
    rows.some((row) => row.keyIdeas.includes(topic))
  ) {
    idea = idea || topic;
    topic = "";
  }
  const subject = params.get("subject") ?? "";
  const difficulty = params.get("difficulty") ?? "";
  const verification = params.get("verification") ?? "";
  const page = Number(params.get("page") ?? 1);
  const sort = params.get("sort") ?? "Newest";
  return {
    q: params.get("q") ?? "",
    paper: params.get("paper") ?? "",
    number: params.get('number') ?? '',
    reading: ['on-site','source-only','incomplete','needs-review'].includes(params.get('reading') ?? '') ? params.get('reading')! : '',
    subject: ["Math", "Physics", "CS"].includes(subject) ? subject : "",
    contest: params.get("contest") ?? "",
    year: params.get("year") ?? "",
    topic,
    idea,
    difficulty: difficultyOptions.includes(difficulty) ? difficulty : "",
    verification: ["verified", "needs verification"].includes(verification)
      ? verification
      : "",
    sort: sortOptions.includes(sort) ? sort : "Newest",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function filterArchive(rows: ArchiveRow[], filters: ArchiveFilters) {
  const query = filters.q.trim().toLowerCase();
  const numberQuery = query.match(/^(?:#|p(?:roblem)?\s*)?(\d{1,2})$/i);
  const words = query.split(/\s+/).filter(Boolean);
  return rows
    .filter(
      (row) =>
        (!filters.paper || (row.paperId ?? row.id.replace(/-p\d+$/, "")) === filters.paper) &&
        (!query || (numberQuery ? row.problemNumber === Number(numberQuery[1]) : words.every(word => row.searchText.includes(word)))) &&
        (!filters.number || (/^\d+$/.test(filters.number) && row.problemNumber === Number(filters.number))) &&
        (!filters.reading || row.readingStatus === filters.reading) &&
        (!filters.subject || row.subject === filters.subject) &&
        (!filters.contest || row.contest === filters.contest) &&
        (!filters.year || String(row.year) === filters.year) &&
        (!filters.topic || row.topic === filters.topic) &&
        (!filters.idea || row.keyIdeas.includes(filters.idea)) &&
        (!filters.difficulty || row.difficulty === filters.difficulty) &&
        (!filters.verification ||
          row.verificationStatus === filters.verification),
    )
    .sort((a, b) => {
      // Keep each contest set in reading order for year-based browsing.
      const paperOrder = a.contest.localeCompare(b.contest) ||
        (a.paperId ?? a.id.replace(/-p\d+$/, "")).localeCompare(b.paperId ?? b.id.replace(/-p\d+$/, ""));
      const setOrder = b.year - a.year || paperOrder;
      if (filters.sort === "Oldest")
        return (
          a.year - b.year ||
          paperOrder ||
          a.problemNumber - b.problemNumber
        );
      if (filters.sort === "Difficulty")
        return (
          difficultyRank[a.difficulty] - difficultyRank[b.difficulty] ||
          setOrder ||
          a.problemNumber - b.problemNumber
        );
      if (filters.sort === "Topic")
        return (
          a.topic.localeCompare(b.topic) ||
          setOrder ||
          a.problemNumber - b.problemNumber
        );
      if (filters.sort === "Problem Number")
        return a.problemNumber - b.problemNumber || setOrder;
      return setOrder || a.problemNumber - b.problemNumber;
    });
}

export function archivePage(rows: ArchiveRow[], requestedPage: number) {
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pages);
  return {
    page,
    pages,
    rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

export function problemPreview(text: string) {
  return text
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\n\s*(?:\*\*)?\(A\)(?:\*\*)?[\s\S]*/g, " ")
    .replace(/\\\$/g, "NOVARIS_CURRENCY")
    .replace(/\\[\[\]()]/g, " ")
    .replace(/\\[,;!]/g, " ")
    .replace(/\\[{}]/g, "")
    .replace(/\$+/g, "")
    .replace(/\\(?:frac|binom)\s*{([^{}]+)}\s*{([^{}]+)}/g, "$1/$2")
    .replace(/\\sqrt\s*{([^{}]+)}/g, "√($1)")
    .replace(/\\text\s*{([^{}]+)}/g, "$1")
    .replace(/\\(?:cdot|times)/g, " × ")
    .replace(/\\circ/g, "°")
    .replace(
      /\\(leq|le|geq|ge|neq|ne|ell|pi|ldots|cdots|dots|in)\b/g,
      (_, symbol: string) => {
        const symbols: Record<string, string> = {
          leq: "≤",
          le: "≤",
          geq: "≥",
          ge: "≥",
          neq: "≠",
          ne: "≠",
          ell: "ℓ",
          pi: "π",
          ldots: "…",
          cdots: "…",
          dots: "…",
          in: "∈",
        };
        return ` ${symbols[symbol]} `;
      },
    )
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/[{}*]/g, "")
    .replace(/\s+/g, " ")
    .replace(/NOVARIS_CURRENCY/g, "$")
    .trim()
    .slice(0, 150);
}
