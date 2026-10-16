import { pageMetadata } from "@/lib/site-config";
import { Suspense } from "react";
import { LearningDashboard } from "@/components/learning-dashboard";
import { PageHeader, PageShell } from "@/components/site-ui";
import { archiveRows } from "@/lib/archive-data";

export const metadata = { ...pageMetadata("My Learning", "Keep a personal list of saved problems, review topics and completed practice in this browser.", "/my-learning"), robots: { index: false, follow: true } };

export default function MyLearningPage() {
  // Only lightweight navigation metadata crosses the client boundary.
  const items = archiveRows.map(({ id, slug, title, contest, year, problemNumber, topic, difficulty }) => ({
    id, slug, title, contest, year, problemNumber, topic, difficulty,
  }));
  return (
    <PageShell>
      <PageHeader eyebrow="Your practice" title="My Learning" description="Return to saved problems, plan a review session and keep track of what you have completed. Your list belongs to this browser." />
      <Suspense fallback={<p role="status" className="py-8 text-muted">Loading your learning list…</p>}>
        <LearningDashboard items={items} />
      </Suspense>
    </PageShell>
  );
}
