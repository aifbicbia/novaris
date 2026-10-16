import Link from "next/link";
import { PageHeader, PageShell, StatusNotice } from "@/components/site-ui";
import { pageMetadata } from "@/lib/site-config";
export const metadata = pageMetadata("Study notes", "The study-note collection is planned. The archive and study guide are available now.", "/blog");
export default function PlannedPage() {
  return <PageShell><PageHeader eyebrow="Coming soon" title="Study notes" description="The study-note collection is planned. The archive and study guide are available now." /><StatusNotice title="Independent practice is available"><p>Use the published archive for problems and worked explanations. Planned services have no launch date or enrolment process.</p></StatusNotice><div className="flex flex-wrap gap-3"><Link href="/archive" prefetch={false} className="button-primary">Browse the archive →</Link><Link prefetch={false} href="/guide" className="button-secondary">Read the study guide</Link></div></PageShell>;
}
