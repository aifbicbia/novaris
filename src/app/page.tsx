import { pageMetadata } from "@/lib/site-config";
import Link from "next/link";
import { ButtonLink, PageShell, TagCloud } from "@/components/site-ui";
import { archiveStats, contestCoverage, popularArchiveTopics } from "@/lib/archive-data";

export const metadata = pageMetadata("Competition learning", "Sourced mathematics, physics and programming contest problems with worked explanations.", "/");

export default function Home() {
  const featured = ["AMC 8", "F=ma", "USACO Bronze"]
    .map(contest => contestCoverage.find(entry => entry.contest === contest))
    .filter(entry => entry !== undefined);

  const subjects = [
    { name: "Mathematics", subject: "Math", action: "Browse mathematics", note: "AMC, AIME and historical olympiad papers, organised by contest, year and topic." },
    { name: "Physics", subject: "Physics", action: "Browse physics", note: "F=ma, Physics Bowl and USAPhO problems with worked calculations and derivations." },
    { name: "Computer science", subject: "CS", action: "Browse computer science", note: "USACO tasks with algorithm explanations, correctness arguments and C++ reference code." },
  ].map((subject) => {
    const available = contestCoverage.filter((entry) => entry.subject === subject.subject);
    return {
      ...subject,
      status: available.length ? "Available" : "Coming soon",
      body: available.length
        ? subject.note
        : `${subject.name} resources are planned. Publication follows source and solution review.`,
      href: available.length ? `/archive?subject=${subject.subject}` : `/programs#${subject.subject.toLowerCase()}`,
      action: available.length ? subject.action : "View the plan",
    };
  });

  return (
    <PageShell>
      <section className="grid gap-9 pb-8 pt-2 md:grid-cols-[1.2fr_1fr] md:items-center md:gap-16 md:pb-12">
        <div>
          <p className="eyebrow">A student-led project</p>
          <h1 className="font-display mt-4 text-[clamp(2.5rem,4.5vw,3.4rem)] leading-[1.12] text-navy">
            A library for<br />competition practice.
          </h1>
          <p className="section-intro mt-5 max-w-lg text-lg">
            Find a past paper in mathematics, physics or programming.
            Try a problem, then read the worked explanation at your own pace.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/archive">Browse the archive <span aria-hidden="true">→</span></ButtonLink>
            <ButtonLink href="/my-learning" secondary>My Learning</ButtonLink>
          </div>
          <p className="mt-4 text-sm text-muted">Free resources for independent study.</p>
        </div>
        <div className="border-l-2 border-gold pl-5 sm:pl-7">
          <h2 className="eyebrow">Browse a collection</h2>
          <div className="mt-2 divide-y divide-border">
            {featured.map(coverage => (
              <Link prefetch={false} key={coverage.contest} href={`${coverage.href}&year=${coverage.latest}`} className="group flex min-h-20 items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-display text-2xl text-navy group-hover:text-blue">{coverage.contest}</p>
                  <p className="mt-1 text-xs text-muted">{coverage.sets} {coverage.sets === 1 ? "paper" : "papers"} in the archive</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-blue">{coverage.latest} <span aria-hidden="true">→</span></span>
              </Link>
            ))}
          </div>
          <Link prefetch={false} href="/archive" className="text-link mt-1 inline-flex min-h-11 items-center text-sm">All {contestCoverage.length} collections →</Link>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-y border-border py-5">
        <dl className="flex flex-wrap gap-x-7 gap-y-2 text-sm">
          <div className="flex items-baseline gap-2"><dd className="font-display text-2xl text-navy">{archiveStats.sets}</dd><dt className="text-muted">papers</dt></div>
          <div className="flex items-baseline gap-2"><dd className="font-display text-2xl text-navy">{archiveStats.problems.toLocaleString("en-US")}</dd><dt className="text-muted">problem entries</dt></div>
        </dl>
        <Link prefetch={false} href="/source-policy" className="text-link inline-flex min-h-11 items-center text-xs">Availability & source policy →</Link>
      </div>

      <section className="grid gap-6 py-9 md:grid-cols-[240px_1fr] md:gap-14 md:py-12">
        <div>
          <h2 className="section-heading">Choose your subject</h2>
        </div>
        <div className="divide-y divide-border">
          {subjects.map((subject, index) => (
            <article key={subject.name} className={`grid gap-2 py-5 sm:grid-cols-[1fr_auto] sm:gap-6 ${index === 0 ? "pt-0" : ""}`}>
              <div>
                <div className="flex flex-wrap items-center gap-3"><h3 className="font-display text-2xl text-navy">{subject.name}</h3>{subject.status === "Coming soon" && <span className="status-label">{subject.status}</span>}</div>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{subject.body}</p>
              </div>
              <Link prefetch={false} href={subject.href} className="text-link inline-flex min-h-11 items-center self-center text-sm">{subject.action} <span aria-hidden="true" className="ml-2">→</span></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 border-y border-border py-9 md:grid-cols-[240px_1fr] md:gap-14 md:py-12">
        <div>
          <h2 className="section-heading">Keep track of your work</h2>
        </div>
        <div>
          <p className="section-intro text-base">Save a problem for later, mark an attempt completed, or add a question to your review list. My Learning keeps these lists together.</p>
          <p className="mt-3 text-sm text-muted">Your learning list stays in this browser. No account required.</p>
          <Link prefetch={false} href="/my-learning" className="text-link mt-2 inline-flex min-h-11 items-center text-sm">Open My Learning →</Link>
          <div className="mt-5 border-t border-border pt-5">
            <h3 className="mb-3 text-sm font-semibold text-navy">Or start with a topic</h3>
            <TagCloud tags={popularArchiveTopics} />
          </div>
        </div>
      </section>

      <p className="pt-5 text-sm leading-6 text-muted">Every entry includes source references. Some statements open at their source while display permission is reviewed. <Link prefetch={false} href="/about" className="text-link">About Novaris →</Link></p>
    </PageShell>
  );
}
