import Link from "next/link";
import { PageHeader, PageShell, StatusNotice } from "@/components/site-ui";
import { pageMetadata } from "@/lib/site-config";
export const metadata = pageMetadata("Peer tutoring", "Tutor profiles and bookings are not available. Peer tutoring is planned.", "/tutors");
export default function PlannedPage() {
  return <PageShell><PageHeader eyebrow="Coming soon" title="Peer tutoring" description="Tutor profiles and bookings are not available. Peer tutoring is planned." /><StatusNotice title="Independent practice is available"><p>Use the published archive for problems and worked explanations. Planned services have no launch date or enrolment process.</p></StatusNotice><div className="flex flex-wrap gap-3"><Link href="/archive" prefetch={false} className="button-primary">Browse the archive →</Link><Link prefetch={false} href="/guide" className="button-secondary">Read the study guide</Link></div></PageShell>;
}
