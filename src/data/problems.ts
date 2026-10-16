import {
  contestGroups,
  contestRecords,
  type ContestGroup,
  type ContestRecord,
  type Subject,
} from "@/data/contests";
import { activeContestSetImports } from "@/data/contest-sets";
import { getSolutionForProblem } from "@/data/solutions";
import type {
  AnswerType,
  Difficulty,
  Problem,
  ProblemRecord,
  ProblemTextStatus,
  VerificationStatus,
} from "@/data/schema";

export type {
  ContestGroup,
  ContestRecord,
  Difficulty,
  Problem,
  ProblemRecord,
  Subject,
  VerificationStatus,
};
export { contestGroups, contestRecords };

const batchCreatedAt = "2026-06-21T00:00:00.000Z";

type ContestSetProblemRecord = Omit<
  ProblemRecord,
  | "subject"
  | "contest"
  | "year"
  | "division"
  | "officialSourceName"
  | "officialSourceUrl"
  | "crossCheckSourceName"
  | "crossCheckSourceUrl"
  | "sourceName"
  | "answerSourceName"
  | "copyrightNote"
  | "solutionId"
  | "relatedProblemIds"
  | "createdAt"
  | "updatedAt"
> &
  Partial<
    Pick<
      ProblemRecord,
      | "sourceName"
      | "crossCheckSourceName"
      | "crossCheckSourceUrl"
      | "officialSourceName"
      | "officialSourceUrl"
      | "answerSourceName"
      | "copyrightNote"
    >
  >;

type ContestSetRecord = {
  contestId: string;
  contest: string;
  year: number;
  division: string;
  subject: Subject;
  officialSourceName: string;
  officialSourceUrl: string;
  sourceName: string;
  answerSourceName: string;
  answerSourceUrl: string;
  copyrightNote: string;
  createdAt?: string;
  updatedAt?: string;
  reviewedAt?: string;
  verificationMethod?: string;
  problems: ContestSetProblemRecord[];
};

function buildProblemRecords(contestSet: ContestSetRecord) {
  return contestSet.problems.map((problem, index, records): ProblemRecord => ({
    ...problem,
    answerType: problem.answerType as AnswerType,
    difficulty: problem.difficulty as Difficulty,
    problemTextStatus: problem.problemTextStatus as ProblemTextStatus,
    subject: contestSet.subject,
    contest: contestSet.contest,
    year: contestSet.year,
    division: contestSet.division,
    officialSourceName:
      problem.officialSourceName ?? contestSet.officialSourceName,
    officialSourceUrl:
      problem.officialSourceUrl ?? contestSet.officialSourceUrl,
    crossCheckSourceName:
      problem.crossCheckSourceName ??
      `${contestSet.sourceName} - Problem ${problem.problemNumber}`,
    crossCheckSourceUrl: problem.crossCheckSourceUrl ?? problem.sourceUrl,
    sourceName:
      problem.sourceName ??
      `${contestSet.sourceName} - Problem ${problem.problemNumber}`,
    answerSourceName: problem.answerSourceName ?? contestSet.answerSourceName,
    copyrightNote: problem.copyrightNote ?? contestSet.copyrightNote,
    verificationStatus: problem.verificationStatus as VerificationStatus,
    solutionId: `solution-${problem.id}`,
    relatedProblemIds: [records[index - 1]?.id, records[index + 1]?.id].filter(
      (id): id is string => Boolean(id),
    ),
    createdAt: contestSet.createdAt ?? batchCreatedAt,
    updatedAt: contestSet.updatedAt ?? batchCreatedAt,
    reviewedAt: problem.reviewedAt ?? contestSet.reviewedAt,
    verificationMethod:
      problem.verificationMethod ?? contestSet.verificationMethod,
  }));
}

const problemRecordsBySet = activeContestSetImports.map(({ data }) =>
  buildProblemRecords(data as ContestSetRecord),
);

const problemRecords: ProblemRecord[] = problemRecordsBySet.flat();

export const contestCompletionSummaries = activeContestSetImports.map(
  ({ data }, index) => {
    const contestSet = data as ContestSetRecord;
    const records = problemRecordsBySet[index] ?? [];
    const verificationStatus = records.every(
      (problem) => problem.verificationStatus === "verified",
    )
      ? "verified"
      : "needs verification";

    return {
      id: `${contestSet.contestId}-${contestSet.year}`,
      label: `${contestSet.year} ${contestSet.contest}`,
      complete: records.length,
      total: contestSet.problems.length,
      href: `/archive?contest=${encodeURIComponent(contestSet.contest)}&year=${contestSet.year}`,
      verificationStatus: verificationStatus as VerificationStatus,
    };
  },
);

export const problems: Problem[] = problemRecords.map((problem) => ({
  ...problem,
  solution: getSolutionForProblem(problem.id),
}));

export function formatProblemNumber(
  problem: Pick<ProblemRecord, "problemNumber">,
) {
  return `Problem ${problem.problemNumber}`;
}

export function getProblemBySlug(slug: string) {
  return problems.find((problem) => problem.slug === slug);
}

export function getProblemById(id: string) {
  return problems.find((problem) => problem.id === id);
}

export function getRelatedProblems(problem: Problem) {
  const explicitRelated = problem.relatedProblemIds
    .map((id) => getProblemById(id))
    .filter((candidate): candidate is Problem => Boolean(candidate));

  if (explicitRelated.length > 0) {
    return explicitRelated.slice(0, 3);
  }

  return problems
    .filter(
      (candidate) =>
        candidate.id !== problem.id &&
        (candidate.subject === problem.subject ||
          candidate.topic === problem.topic ||
          candidate.difficulty === problem.difficulty),
    )
    .slice(0, 3);
}

export const allTopics = Array.from(
  new Set(problems.map((problem) => problem.topic)),
).sort();

export const allSubtopics = Array.from(
  new Set(problems.map((problem) => problem.subtopic)),
).sort();

export const allContests = Array.from(
  new Set(problems.map((problem) => problem.contest)),
).sort();

export const allVerificationStatuses: Array<
  VerificationStatus | "All Verification"
> = ["All Verification", "verified", "needs verification"];

export function getContestsForSubject(subject: Subject) {
  return Array.from(
    new Set(
      problems
        .filter((problem) => problem.subject === subject)
        .map((problem) => problem.contest),
    ),
  ).sort();
}
