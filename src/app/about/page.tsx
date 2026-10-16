import { pageMetadata } from "@/lib/site-config";
import Link from "next/link";
import { PageHeader, PageShell, Panel } from "@/components/site-ui";
import { archiveStats } from "@/lib/archive-data";

export const metadata = pageMetadata("About", "About Novaris, a student-led project for sourced competition problems and original learning support.", "/about");
export default function AboutPage() {
  return (
    <PageShell
      aside={
        <Panel title="The current library">
          <dl className="space-y-5">
            {[
              ["Problems", archiveStats.problems.toLocaleString("en-US")],
              ["Papers", String(archiveStats.sets)],
              [
                "Available explanations",
                archiveStats.availableSolutions.toLocaleString("en-US"),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="font-display mt-1 text-3xl">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-xs text-muted">
            Calculated from the published archive. {archiveStats.solutionDisplayHolds} stored explanations are withheld while recorded discrepancies are reviewed.
          </p>
        </Panel>
      }
    >
      <PageHeader
        title="About Novaris"
        description="A student-led project making competition resources easier to find, understand, and use."
      />
      <div className="space-y-4 text-sm">
        <p className="section-intro">
          Novaris brings past competition papers, source references and worked
          explanations into one searchable library for students studying
          mathematics, physics and computer science.
        </p>
        <p className="section-intro">
          Browse by contest and year, attempt a problem, then open the answer
          and explanation. Saved problems and review lists stay in your browser;
          no account is required.
        </p>
        <p className="section-intro">
          Tutoring, discussion, structured programmes, and study notes are in
          planning. There is no account system, booking service, or
          live forum yet.
        </p>
      </div>
      <section className="editorial-section mt-8">
        <h2 className="section-heading">What you can study now</h2>
        <p className="section-intro mt-4 text-sm">
          The library includes AMC and AIME papers, their historical predecessors,
          olympiad proofs, physics exams and USACO programming tasks. Each paper
          keeps its problems in order, with explanations and source references.
          Some statements open at their source; the reading label makes this clear before you begin.
        </p>
        <Link prefetch={false} href="/archive" className="text-link mt-3 inline-flex min-h-11 items-center text-sm">Choose a contest and year →</Link>
        <p className="mt-3 text-xs leading-6 text-muted">
          The year browser lists the actual available papers; a date range does
          not imply that every year was held or published here.
        </p>
      </section>
      <section className="editorial-section">
        <h2 className="section-heading">How we build the library</h2>
        <dl className="mt-5 space-y-5">
          {[
            [
              "Careful sourcing",
              "Keep the contest owner, source references, answer checks, and display status visible. Review evidence is recorded separately from whether a statement can be read here.",
            ],
            [
              "Readable explanations",
              "Show the key idea, the calculation or argument, and the mistakes that can derail another attempt. Novaris explanations are written independently.",
            ],
            [
              "Corrections",
              "Report a problem number and the specific step or source that needs checking. Review history is preserved when an entry is corrected.",
            ],
          ].map(([title, body]) => (
            <div key={title}>
              <dt className="font-semibold text-navy">{title}</dt>
              <dd className="section-intro mt-2 text-sm">{body}</dd>
            </div>
          ))}
        </dl>
        <p className="section-intro mt-5 text-sm">
          Review records distinguish source checks, answer comparisons and
          mathematical or computational checks. The depth of review varies
          across the library; open issues remain labelled. Permission to display
          an original statement is assessed separately.
        </p>
        <Link prefetch={false}
          href="/source-policy"
          className="text-link mt-6 inline-block text-sm"
        >
          Read the source policy →
        </Link>
      </section>
    </PageShell>
  );
}
