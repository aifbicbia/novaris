import { solutionDisplayHold } from "@/lib/solution-availability";
import { pageMetadata } from "@/lib/site-config";
import { keyIdeaLabel } from "@/lib/key-idea-labels";
import { sourceReferenceLabel } from "@/lib/source-labels";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveReturnLink, ProblemContextLink } from "@/components/archive-context-links";
import { LearningControls, PaperLearningProgress } from "@/components/learning-controls";
import { MarkdownMath } from "@/components/MarkdownMath";
import { canDisplayStatement, getContentQuality } from '@/lib/content-quality';
import { readingLabels } from '@/lib/content-labels';
import {
  DifficultyDots,
  PageShell,
  Panel,
  TagCloud,
} from "@/components/site-ui";
import {
  formatProblemNumber,
  problems,
} from "@/data/problems";
import { getProblemBySlug, getProblemsForPaper, getRelatedProblems, getPaperLabelForProblem, getPaperIdForProblem } from "@/lib/problem-index";

type PageProps = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return problems.map((problem) => ({ slug: problem.slug }));
}
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const problem = getProblemBySlug((await params).slug);
  return problem
    ? pageMetadata(problem.title, solutionDisplayHold(problem.id) ? `${problem.contest} ${formatProblemNumber(problem)}: sources and a recorded solution-review notice.` : `${problem.contest} ${formatProblemNumber(problem)}: sources and a worked Novaris explanation.`, `/archive/${problem.slug}`, { index: !solutionDisplayHold(problem.id) })
    : { title: "Problem not found" };
}

export default async function ProblemDetailPage({ params }: PageProps) {
  const problem = getProblemBySlug((await params).slug);
  if (!problem) notFound();
  const quality = getContentQuality(problem.id);
  const displayHold = solutionDisplayHold(problem.id);
  const related = getRelatedProblems(problem);
  const set = getProblemsForPaper(problem.contest, problem.year, problem.division, problem.id)
    .slice()
    .sort((a, b) => a.problemNumber - b.problemNumber);
  const index = set.findIndex((candidate) => candidate.id === problem.id);
  const previous = set[index - 1];
  const next = set[index + 1];
  const paperLabel = getPaperLabelForProblem(problem);
  const displayPaperLabel = problem.subject !== "CS" && problem.division !== problem.contest
    ? `${paperLabel} · ${problem.division}`
    : paperLabel;
  const paperId = getPaperIdForProblem(problem.id);
  const setHref = `/archive?contest=${encodeURIComponent(problem.contest)}&year=${problem.year}${paperId ? `&paper=${encodeURIComponent(paperId)}` : ""}`;

  return (
    <PageShell
      aside={
        <div className="lg:sticky lg:top-28">
          <div className="hidden lg:block">
          <Panel title="In this problem">
            <nav
              aria-label="Problem sections"
              className="text-sm text-blue"
            >
              {[
                ["statement", "Problem statement"],
                ["answer", "Answer"],
                ["solution", "Worked solution"],
                ["ideas", "Key ideas"],
                ["sources", "Sources & attribution"],
              ].map(([id, label]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="flex min-h-11 items-center py-2 hover:underline"
                >
                  {label}
                </a>
              ))}
            </nav>
          </Panel>
          </div>
          <Panel title={displayPaperLabel}>
            <p className="mb-4 text-xs text-muted">
              {set.length} problems in this paper
            </p>
            <nav
              aria-label="Problems in this paper"
              className="grid grid-cols-5 gap-1"
            >
              {set.map((item) => (
                <ProblemContextLink
                  key={item.id}
                  href={`/archive/${item.slug}`}
                  prefetch={false}
                  aria-label={`${item.title}${item.id === problem.id ? ", current problem" : ""}`}
                  aria-current={item.id === problem.id ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-center border text-sm ${item.id === problem.id ? "border-navy bg-navy text-white" : "border-border bg-paper text-blue hover:border-blue"}`}
                >
                  {item.problemNumber}
                </ProblemContextLink>
              ))}
            </nav>
            <PaperLearningProgress problemIds={set.map(item => item.id)} />
            <Link
              href={setHref}
              prefetch={false}
              className="text-link mt-4 inline-block text-sm"
            >
              View this paper →
            </Link>
          </Panel>
          <Panel title="Found an issue?">
            <p className="text-sm leading-6 text-muted">
              Include the problem title and the step or source that needs a
              closer look.
            </p>
            <Link prefetch={false}
              href={`/contact?problem=${encodeURIComponent(problem.title)}`}
              className="text-link mt-3 inline-block text-sm"
            >
              Report a correction →
            </Link>
          </Panel>
        </div>
      }
    >
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted"
      >
        <ArchiveReturnLink />
        <span aria-hidden="true">/</span>
        <Link
          href={`/archive?subject=${problem.subject}`}
          prefetch={false}
          className="hover:text-blue"
        >
          {problem.subject}
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={setHref} prefetch={false} className="hover:text-blue">
          {displayPaperLabel}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Problem {problem.problemNumber}</span>
      </nav>
      <article className="reading-column">
        <header className="pb-5">
          <p className="eyebrow">
            {displayPaperLabel}
          </p>
          <h1 className="font-display mt-3 text-[clamp(1.8rem,3vw,2.3rem)] leading-tight text-navy">
            {problem.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-muted">
            <Link
              href={`/archive?topic=${encodeURIComponent(problem.topic)}`}
              prefetch={false}
              className="text-link"
            >
              {problem.topic}
            </Link>
            <span>{keyIdeaLabel(problem.subtopic)}</span>
            <span className="flex items-center gap-2">
              <DifficultyDots difficulty={problem.difficulty} />
              {problem.difficulty}
            </span>
            <span>{readingLabels[quality.reading]}</span>
            <a href="#sources" className="text-link">Review details ↓</a>
          </div>
        </header>
        <div className="mb-5">
          <LearningControls problemId={problem.id} problemTitle={problem.title} />
          <p className="mt-3 text-xs text-muted">Learning activity stays in this browser. <Link prefetch={false} href="/my-learning" className="text-link">My Learning →</Link></p>
        </div>
        <nav aria-label="Problem sections" className="mb-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-border py-3 text-sm lg:hidden">
          {[
            ["statement", "Statement"],
            ["answer", "Answer"],
            ["solution", "Solution"],
            ["sources", "Sources"],
          ].map(([id, label]) => <a key={id} href={`#${id}`} className="text-link inline-flex min-h-11 items-center">{label}</a>)}
        </nav>
        <section id="statement" className="study-section">
          <h2>Problem statement</h2>
          {quality.issues.length > 0 && (
            <p role="note" className="mt-4 border-l-2 border-gold pl-4 text-sm leading-6 text-muted">
              This archived statement needs a source check. {quality.issues.join(' ')}{' '}
              <a href={problem.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-link">Compare the original ↗</a>
            </p>
          )}
          <div className="mt-5 text-[17px]">
            {problem.problemTextStatus === "included" && canDisplayStatement(problem.id) ? (
              <MarkdownMath content={problem.problemText} formatChoices />
            ) : (
              <div className="border-l-2 border-gold bg-background p-5">
                <p className="text-sm font-semibold text-navy">
                  Read the original at its source
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  The statement and any original diagrams are hosted externally.
                  Permission to reproduce them on Novaris has not been
                  established. {displayHold ? "The stored solution is currently under review." : "Our original worked solution is available below."}
                </p>
                <a
                  href={problem.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button-primary mt-4"
                >
                  Open problem {problem.problemNumber} at the source ↗
                </a>
                <p className="mt-2 text-xs text-muted">
                  Opens in a new tab so you can keep the problem beside this
                  explanation.
                </p>
              </div>
            )}
          </div>
          <p className="mt-6 text-xs text-muted">
            Recorded contest reference: {problem.officialSourceName}.{" "}
            <a href="#sources" className="text-link">
              View source references below.
            </a>
          </p>
        </section>
        {displayHold ? (
          <section id="answer" className="study-section">
            <h2>Answer and solution under review</h2>
            <p role="note" className="mt-4 border-l-2 border-gold pl-4 text-sm leading-6 text-muted">{displayHold} The stored answer and explanation are withheld until this discrepancy is resolved.</p>
            <div id="solution" className="mt-4"><a href={problem.answerSourceUrl} target="_blank" rel="noopener noreferrer" className="text-link">Open the answer reference ↗</a></div>
          </section>
        ) : (<>
        {/* Preserve native disclosure state if opened before hydration. */}
        <details
          suppressHydrationWarning
          id="answer"
          className="reveal scroll-mt-28"
        >
          <summary>
            <span className="disclosure-closed">Show answer</span>
            <span className="disclosure-open">Hide answer</span>{" "}
            <span className="ml-2 text-xs font-normal text-muted">
              After your attempt
            </span>
          </summary>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <MarkdownMath
              content={problem.solution.finalAnswer}
              className="w-full min-w-0 text-xl text-navy sm:w-auto sm:flex-1"
            />
            <p className="text-xs text-muted">
              {problem.answerType === "integer"
                ? "Integer answer"
                : problem.answerType === "multiple-choice"
                  ? "Multiple choice"
                  : problem.answerType === "code"
                    ? "Programming task"
                    : problem.answerType === "proof"
                      ? problem.subject === "Physics" ? "Written response" : "Proof"
                      : problem.answerType}
              {problem.answerType === "integer" &&
              problem.contest.startsWith("AIME") ? (
                <span className="mt-1 block">
                  Answer sheet: {problem.answer.padStart(3, "0")}
                </span>
              ) : null}
            </p>
            <a
              href={problem.answerSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link text-sm"
            >
              Answer cross-check ↗
            </a>
          </div>
        </details>
        <details
          suppressHydrationWarning
          id="solution"
          className="study-section mt-8"
        >
          <summary className="text-navy">
            <h2 className="inline">Worked solution</h2>
            <span className="mt-1 block text-sm text-muted">
              <span className="disclosure-closed">Show solution</span>
              <span className="disclosure-open">Hide solution</span>
            </span>
          </summary>
          <div className="mt-6">
            <p className="mb-5 text-xs text-muted">
              Written by {problem.solution.writtenBy} ·{" "}
              {quality.mathReview === 'independent-check-recorded' ? 'Independent check recorded' : 'Further mathematical review needed'}
            </p>
            <MarkdownMath
              content={problem.solution.shortExplanation}
              className="border-l-2 border-gold pl-5 text-[17px]"
            />
            <ol
              className="solution-steps mt-7 list-decimal space-y-6 pl-5 text-[17px]"
              aria-label="Solution steps"
            >
              {problem.solution.detailedSteps.map((step, i) => (
                <li key={i} className="pl-1">
                  <MarkdownMath content={step.replace(new RegExp(`^\\*\\*${i + 1}\\.\\s+`), "**")} />
                </li>
              ))}
            </ol>
            <div className="mt-8 border-y border-border py-5">
              <h3 className="mb-2 text-sm font-semibold">Final answer</h3>
              <MarkdownMath
                content={problem.solution.finalAnswer}
                className="text-lg"
              />
            </div>
            <section className="mt-7">
              <h3 className="font-display text-xl text-navy">
                Common mistakes
              </h3>
              <ul className="mt-3 list-disc space-y-3 pl-5 text-sm">
                {problem.solution.commonMistakes.map((mistake, i) => (
                  <li key={i}>
                    <MarkdownMath content={mistake} />
                  </li>
                ))}
              </ul>
            </section>
            {problem.solution.alternativeMethods.length ? (
              <section className="mt-7">
                <h3 className="font-display text-xl text-navy">
                  Another approach
                </h3>
                <div className="mt-3 space-y-3 text-sm">
                  {problem.solution.alternativeMethods.map((method, i) => (
                    <MarkdownMath key={i} content={method} />
                  ))}
                </div>
              </section>
            ) : null}
            <div className="mt-7 bg-background p-4 text-sm">
              <MarkdownMath
                content={`**Difficulty note:** ${problem.solution.difficultyNotes}`}
              />
            </div>
          </div>
        </details>
        </>)}
        <section id="ideas" className="study-section">
          <h2>Key ideas</h2>
          <p className="mt-2 text-sm text-muted">
            Find more problems that use the same ideas.
          </p>
          <div className="mt-4">
            {displayHold ? <p className="text-sm text-muted">The stored solution ideas remain under review. Browse the <Link prefetch={false} href={`/archive?topic=${encodeURIComponent(problem.topic)}`} className="text-link">{problem.topic} collection</Link> for other practice.</p> : <TagCloud tags={problem.solution.keyIdeas} parameter="idea" />}
          </div>
        </section>
        <section id="sources" className="study-section">
          <h2>Sources & attribution</h2>
          <dl className="mt-5 space-y-4 text-sm">
            {[
              [
                "Contest reference",
                problem.officialSourceName,
                problem.officialSourceUrl,
              ],
              ["Statement source", problem.sourceName, problem.sourceUrl],
              [
                "Additional source cross-check",
                problem.crossCheckSourceName,
                problem.crossCheckSourceUrl,
              ],
              [
                "Public answer-key cross-check",
                problem.answerSourceName,
                problem.answerSourceUrl,
              ],
            ].map(([label, name, href]) => (
              <div key={label}>
                <dt className="mb-1 text-xs text-muted">{label}</dt>
                <dd>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link"
                  >
                    {sourceReferenceLabel(name, href)} ↗
                  </a>
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 space-y-2 border-l-2 border-gold pl-4 text-xs leading-6 text-muted">
            <p><strong>Answer evidence:</strong> {quality.answerReview === 'answer-key-recorded' ? 'Answer-key comparison documented in the review record.' : 'A legacy answer reference is retained; a detailed answer audit is still needed.'}</p>
            <p><strong>Mathematical review:</strong> {quality.mathReview === 'independent-check-recorded' ? 'An independent check is recorded. Review depth varies across the library; the record is evidence, not a guarantee of correctness.' : 'Further review is needed. The original explanation and its source references are retained.'}</p>
            <p><strong>Display permission:</strong> {quality.rights === 'documented-educational-use' ? <>Copyright © {problem.year}, The Mathematical Association of America. Noncommercial educational use under the conditions printed in the original paper. <a className="text-link" href={quality.rightsUrl} target="_blank" rel="noopener noreferrer">Permission reference ↗</a></> : quality.rights === 'permission-not-established' ? 'Full-text permission has not been established; the original statement remains at its source.' : 'The original is available through the source link. Reproduction permission for this legacy record has not been documented; stored archival text is preserved privately.'}</p>
            <p>Contest material belongs to its original owner. Novaris provides its own explanations.</p>
          </div>
          <Link prefetch={false}
            href="/source-policy"
            className="text-link mt-3 inline-block text-sm"
          >
            Read the source policy →
          </Link>
        </section>
      </article>
      <nav
        aria-label="Continue this paper"
        className="reading-column grid grid-cols-2 gap-4 border-y border-border py-6"
      >
        {previous ? (
          <ProblemContextLink href={`/archive/${previous.slug}`} className="text-blue">
            <span className="block text-xs text-muted">← Previous problem</span>
            <span className="mt-1 block text-sm font-semibold">
              {formatProblemNumber(previous)}
            </span>
          </ProblemContextLink>
        ) : (
          <Link prefetch={false} href={setHref} className="text-link self-center text-sm">
            Back to paper
          </Link>
        )}
        {next ? (
          <ProblemContextLink href={`/archive/${next.slug}`} className="text-right text-blue">
            <span className="block text-xs text-muted">Next problem →</span>
            <span className="mt-1 block text-sm font-semibold">
              {formatProblemNumber(next)}
            </span>
          </ProblemContextLink>
        ) : (
          <Link prefetch={false}
            href={setHref}
            className="text-link self-center text-right text-sm"
          >
            End of paper · Back to archive →
          </Link>
        )}
      </nav>
      {related.length ? (
        <section className="reading-column pt-8">
          <h2 className="font-display text-2xl">Related problems</h2>
          <div className="mt-4 divide-y divide-border">
            {related.map((item) => (
              <ProblemContextLink
                key={item.id}
                href={`/archive/${item.slug}`}
                className="flex items-center justify-between gap-4 py-3 text-sm text-blue"
              >
                <span>
                  {item.title}
                  <span className="ml-3 text-xs text-muted">{item.topic}</span>
                </span>
                <span aria-hidden="true">→</span>
              </ProblemContextLink>
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
