import { pageMetadata } from "@/lib/site-config";
import Link from "next/link";
import { contestGroups } from "@/data/contests";
import { archiveStats, contestCoverage } from "@/lib/archive-data";
import { PageHeader, PageShell } from "@/components/site-ui";

export const metadata = pageMetadata("Programs", "Novaris learning pathways and resource plans for mathematics, physics, and computer science competitions.", "/programs");
export default function ProgramsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Programs"
        description="Find resources for independent practice and see what is planned for each subject."
      />
      <p className="section-intro mb-6 text-sm">
        Browse {archiveStats.sets} published papers for independent practice.
        Structured courses, enrolment and tutor-led groups are still planned.
      </p>
      <nav aria-label="Program subjects" className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <a href="#math" className="text-link py-2">Mathematics</a>
        <a href="#physics" className="text-link py-2">Physics</a>
        <a href="#cs" className="text-link py-2">Computer science</a>
      </nav>
      {contestGroups.map((group) => {
        const available = contestCoverage.filter((set) => set.subject === group.subject);
        const planned = group.contests.filter((contest) => !archiveStats.contests.includes(contest));
        return (
          <section
            id={group.subject.toLowerCase()}
            key={group.subject}
            className="editorial-section grid scroll-mt-28 gap-4 md:grid-cols-[210px_1fr] md:gap-12"
          >
            <div>
              <h2 className="section-heading">
                {group.subject === "CS" ? "Computer science" : group.subject === "Math" ? "Mathematics" : "Physics"}
              </h2>
              <p className="mt-2 text-xs text-muted">{available.length ? "Archive resources available" : "Coming soon"}</p>
            </div>
            <div>
              <p className="section-intro text-sm">{group.description}</p>
              {available.length > 0 && (
                <>
                  <ul className="mt-4 grid gap-x-7 sm:grid-cols-2">
                    {available.map((set) => (
                      <li key={set.contest} className="border-b border-border">
                        <Link prefetch={false} href={set.href} className="group flex min-h-12 items-center justify-between gap-3 py-2 text-sm">
                          <span className="text-link">{set.contest}</span>
                          <span className="shrink-0 text-xs text-muted">{set.sets} {set.sets === 1 ? "paper" : "papers"} <span aria-hidden="true">→</span></span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs leading-6 text-muted">Statements are marked as readable here or available at their source. Available explanations remain on Novaris; a review notice identifies any withheld solution.</p>
                </>
              )}
              {planned.length > 0 && (
                <p className="mt-5 text-sm leading-7 text-muted">
                  <span className="font-semibold text-navy">Coming soon: </span>
                  {planned.join(" · ")}
                </p>
              )}
              {!available.length && (
                <p className="mt-3 max-w-xl text-xs leading-6 text-muted">
                  Publication depends on source, display-permission, answer, and explanation reviews. No launch date is set.
                </p>
              )}
            </div>
          </section>
        );
      })}
      <section className="editorial-section reading-column">
        <h2 className="section-heading">A simple practice routine</h2>
        <p className="section-intro mt-3 text-sm">
          Choose a paper, attempt the problems in order, and read the explanation
          after trying. Mark difficult questions for review in My Learning, then
          use topic filters to find another problem using the same method.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link prefetch={false} href="/archive" className="button-primary">Find a paper →</Link>
          <Link prefetch={false} href="/my-learning" className="button-secondary">My Learning</Link>
        </div>
      </section>
    </PageShell>
  );
}
