import type { ContestGroup, ContestRecord } from "@/data/schema";
export type { ContestGroup, ContestRecord, Subject } from "@/data/schema";

export const contestRecords: ContestRecord[] = [
  {
    id: "amc-8",
    name: "AMC 8",
    subject: "Math",
    status: "active",
    owner: "Mathematical Association of America",
    description:
      "Middle school contest problems used for arithmetic, algebra, geometry, counting, and reasoning practice.",
  },
  {
    id: "amc-10a",
    name: "AMC 10A",
    subject: "Math",
    status: "active",
    owner: "Mathematical Association of America",
    description:
      "High school multiple-choice contest used for algebra, geometry, counting, and number theory preparation.",
  },
  {
    id: "amc-10b",
    name: "AMC 10B",
    subject: "Math",
    status: "active",
    owner: "Mathematical Association of America",
    description:
      "The alternate AMC 10 administration, organized as a separate historical contest set in the archive.",
  },
  {
    id: "amc-12a",
    name: "AMC 12A",
    subject: "Math",
    status: "active",
    owner: "Mathematical Association of America",
    description:
      "High school multiple-choice contest covering the AMC 10 range plus additional precalculus topics.",
  },
  {
    id: "amc-12b",
    name: "AMC 12B",
    subject: "Math",
    status: "active",
    owner: "Mathematical Association of America",
    description:
      "The alternate AMC 12 administration, organized as a separate historical contest set in the archive.",
  },
  {
    id: "aime-i",
    name: "AIME I",
    subject: "Math",
    status: "active",
    owner: "Mathematical Association of America",
    description:
      "Invitation-only short-answer contest that bridges AMC 10/12 qualification and olympiad-level training.",
  },
  {
    id: "aime-ii",
    name: "AIME II",
    subject: "Math",
    status: "active",
    owner: "Mathematical Association of America",
    description:
      "The alternate AIME administration, with 15 integer-answer problems and original worked explanations.",
  },
  {
    id: "usajmo",
    name: "USAJMO",
    subject: "Math",
    status: "active",
    owner: "Mathematical Association of America",
    description:
      "Historical junior olympiad papers with complete original proofs and external source references. Each edition retains its actual questions and day structure.",
  },
  {
    id: "usamo",
    name: "USAMO",
    subject: "Math",
    status: "active",
    owner: "Mathematical Association of America",
    description:
      "Historical proof contests with original complete arguments and recorded source review. Earlier and modern editions preserve their different question counts and writing schedules.",
  },
  {
    id: "fma",
    name: "F=ma",
    subject: "Physics",
    status: "active",
    owner: "American Association of Physics Teachers",
    description:
      "Mechanics contest practice with official source links and original explanations. Historical editions retain their actual format and shared instructions.",
  },
  {
    id: "physics-bowl",
    name: "Physics Bowl",
    subject: "Physics",
    status: "active",
    owner: "American Association of Physics Teachers",
    description:
      "Historical physics booklets with official source links and original explanations. Each edition preserves its actual question count and division ranges.",
  },
  {
    id: "usaco-bronze",
    name: "USACO Bronze",
    subject: "CS",
    status: "active",
    owner: "United States of America Computing Olympiad",
    description:
      "Historical programming contests with official task links, original correctness proofs and independently tested C++ implementations. Each round retains its actual task count and season.",
  },
  {
    id: "usaco-silver",
    name: "USACO Silver",
    subject: "CS",
    status: "active",
    owner: "United States of America Computing Olympiad",
    description:
      "Historical programming contests with original algorithm explanations and tested implementations. Editions preserve their original input and output interfaces.",
  },
  {
    id: "usaco-gold",
    name: "USACO Gold",
    subject: "CS",
    status: "active",
    owner: "United States of America Computing Olympiad",
    description:
      "Historical algorithm contests with original correctness proofs and tested implementations. Every edition retains its actual tasks, season and input and output interfaces.",
  },
  {
    id: "usaco-platinum",
    name: "USACO Platinum",
    subject: "CS",
    status: "active",
    owner: "United States of America Computing Olympiad",
    description:
      "Advanced historical programming contests with complete original correctness proofs and tested C++ implementations. Platinum begins in December 2015; earlier Gold remains a separate division.",
  },
  {
    id: "usapho",
    name: "USAPhO",
    subject: "Physics",
    status: "active",
    owner: "American Association of Physics Teachers",
    description:
      "Historical written physics exams with original derivations and official source links. Each paper preserves its actual parts, question labels, time limits and approximation models.",
  },
];

export const contestGroups: ContestGroup[] = [
  {
    subject: "Math",
    description:
      "Training pathways from middle school contest foundations through proof-based olympiad work.",
    contests: [
      "AMC 8",
      "AMC 10A",
      "AMC 10B",
      "AMC 12A",
      "AMC 12B",
      "AIME I",
      "AIME II",
      "USAJMO",
      "USAMO",
    ],
  },
  {
    subject: "Physics",
    description:
      "Mechanics, electromagnetism, and olympiad-style modeling practice for physics competitors.",
    contests: ["F=ma", "Physics Bowl", "USAPhO"],
  },
  {
    subject: "CS",
    description:
      "Algorithmic problem solving from implementation basics to advanced USACO training.",
    contests: ["USACO Bronze", "USACO Silver", "USACO Gold", "USACO Platinum"],
  },
];
