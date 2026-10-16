export type Subject = "Math" | "Physics" | "CS";

export type Difficulty =
  "Introductory" | "Intermediate" | "Advanced" | "Olympiad";

export type ProblemTextStatus =
  "included" | "linked-only" | "needs verification";

export type AnswerType = "multiple-choice" | "integer" | "proof" | "code";

export type VerificationStatus = "verified" | "needs verification";

export type ContestStatus = "active" | "planned";

export type SourceRecord = {
  id: string;
  name: string;
  url: string;
  owner: string;
  copyrightNote: string;
};

export type ContestRecord = {
  id: string;
  name: string;
  subject: Subject;
  status: ContestStatus;
  owner: string;
  description: string;
};

export type ContestGroup = {
  subject: Subject;
  description: string;
  contests: string[];
};

export type TagRecord = {
  id: string;
  label: string;
  subject: Subject;
};

export type ProblemRecord = {
  id: string;
  slug: string;
  subject: Subject;
  contest: string;
  year: number;
  division: string;
  problemNumber: number;
  title: string;
  problemText: string;
  problemTextStatus: ProblemTextStatus;
  answer: string;
  /** LaTeX answer value, separate from an AMC option letter. */
  answerValue?: string;
  answerType: AnswerType;
  topic: string;
  subtopic: string;
  difficulty: Difficulty;
  officialSourceName: string;
  officialSourceUrl: string;
  crossCheckSourceName: string;
  crossCheckSourceUrl: string;
  sourceName: string;
  sourceUrl: string;
  answerSourceName: string;
  answerSourceUrl: string;
  copyrightNote: string;
  verificationStatus: VerificationStatus;
  solutionId: string;
  relatedProblemIds: string[];
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  verificationMethod?: string;
};

export type SolutionRecord = {
  id: string;
  problemId: string;
  finalAnswer: string;
  shortExplanation: string;
  detailedSteps: string[];
  keyIdeas: string[];
  commonMistakes: string[];
  alternativeMethods: string[];
  difficultyNotes: string;
  writtenBy: "Novaris";
  verificationStatus: VerificationStatus;
};

export type Problem = ProblemRecord & {
  solution: SolutionRecord;
};
