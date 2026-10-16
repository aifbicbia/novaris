import { ButtonLink, PageHeader, PageShell } from "@/components/site-ui";

export default function NotFound() {
  return (
    <PageShell>
      <PageHeader eyebrow="Page not found" title="Let’s find your next problem." description="This address doesn’t match a page in the archive. Try searching by contest, year, or problem number." />
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/archive">Browse the archive →</ButtonLink>
        <ButtonLink href="/my-learning" secondary>My Learning</ButtonLink>
      </div>
    </PageShell>
  );
}
