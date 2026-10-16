import { pageMetadata } from "@/lib/site-config";
import Link from "next/link";
import { Suspense } from "react";
import { ProblemArchive } from "@/components/problem-archive";
import { PageHeader, PageShell } from "@/components/site-ui";
import { archiveRows, archiveStats, contestCoverage, archivePaperLabels } from "@/lib/archive-data";
import { qualityCounts } from '@/lib/content-quality';
import { packArchiveRows } from "@/lib/archive-packet";

export const metadata = pageMetadata("Problem Archive", "Find contest problems by contest, year, topic, or difficulty, with sources and original Novaris solutions.", "/archive");

export default function ArchivePage() {
  return (
    <PageShell>
      <div className="grid gap-x-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <PageHeader
        eyebrow="The problem library"
        title="Problem Archive"
        description="Find a contest paper or practise a topic. Check reading and review labels before you begin."
      />
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm text-muted md:block md:border-l-2 md:border-gold md:pl-4 md:pt-1">
        <p><strong className="font-semibold text-navy">{archiveStats.problems.toLocaleString("en-US")}</strong> problems · {archiveStats.sets} papers</p>
        <Link prefetch={false} href="/source-policy" className="text-link inline-flex min-h-8 items-center text-xs">Sources & attribution →</Link>
      </div>
      </div>
      <p className="mb-5 text-xs leading-5 text-muted">
          {qualityCounts.onSite} statements on site · {qualityCounts.sourceOnly} at source · {qualityCounts.incomplete + qualityCounts.needsReview} needing statement review · {archiveStats.solutionDisplayHolds} stored solutions currently withheld.
      </p>
      <Suspense
        fallback={
          <div className="soft-card p-6" role="status">
            Loading archive filters…
          </div>
        }
      >
        <ProblemArchive packet={packArchiveRows(archiveRows)} coverage={contestCoverage} paperLabels={archivePaperLabels} />
      </Suspense>
    </PageShell>
  );
}
