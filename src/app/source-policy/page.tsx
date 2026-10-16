import { pageMetadata } from "@/lib/site-config";
import Link from "next/link";
import { PageHeader, PageShell, Panel } from "@/components/site-ui";

export const metadata = pageMetadata("Source Policy", "Novaris source, attribution, and copyright policy.", "/source-policy");

const sections = [
  ["status-labels", "Reading and review labels"],
  ["permissions", "Display permissions"],
  ["original-work", "Attribution and original work"],
  ["publication", "Publication and corrections"],
];

export default function SourcePolicyPage() {
  return (
    <PageShell aside={
      <div className="hidden lg:sticky lg:top-28 lg:block">
        <Panel title="On this page">
          <nav aria-label="Source policy sections" className="space-y-1">
            {sections.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="text-link block py-2 text-sm">{label}</a>
            ))}
          </nav>
        </Panel>
      </div>
    }>
      <PageHeader
        eyebrow="Editorial standards"
        title="Source Policy"
        description="How we attribute contest material, record review evidence, and decide what can be displayed on Novaris."
      />
      <p className="section-intro mb-8">
        Every problem page keeps its source references visible. Some statements
        can be read here; others open at their source alongside a Novaris
        explanation. Content availability, mathematical review, and display
        permission are recorded separately.
      </p>
      <nav aria-label="Source policy sections" className="mb-6 grid gap-x-5 text-sm sm:grid-cols-2 lg:hidden">
        {sections.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="text-link inline-flex min-h-11 items-center">{label}</a>
        ))}
      </nav>

      <section id="status-labels" className="editorial-section scroll-mt-28" aria-labelledby="status-heading">
        <h2 id="status-heading" className="section-heading">Reading and review labels</h2>
        <dl className="mt-5 divide-y divide-border text-sm">
          <div className="pb-4">
            <dt className="font-semibold text-navy">Read here</dt>
            <dd className="section-intro mt-1">Describes available content. It does not certify mathematical correctness or grant a copyright licence.</dd>
          </div>
          <div className="py-4">
            <dt className="font-semibold text-navy">Statement at source</dt>
            <dd className="section-intro mt-1">The original problem must be opened externally. Incomplete statements and mixed legacy image crops are separately marked for review.</dd>
          </div>
          <div className="py-4">
            <dt className="font-semibold text-navy">Review documented</dt>
            <dd className="section-intro mt-1">A structured record contains an answer-key comparison and an independent check. The record describes available evidence and does not guarantee an error-free explanation.</dd>
          </div>
          <div className="py-4">
            <dt className="font-semibold text-navy">Further review</dt>
            <dd className="section-intro mt-1">Older Verified labels remain in the original data, but pages use this more cautious label where the required evidence is missing or an issue remains open.</dd>
          </div>
        </dl>
      </section>

      <section id="permissions" className="editorial-section scroll-mt-28" aria-labelledby="permission-heading">
        <h2 id="permission-heading" className="section-heading">Public access is not permission to republish</h2>
        <div className="mt-4 space-y-4 text-sm">
          <p className="section-intro">A freely accessible paper does not by itself permit copying it onto another website. Full statements and original diagrams require a documented basis for display. Permission granted to another publisher is not permission for Novaris.</p>
          <p className="section-intro">Where permission is not established, new material is limited to source links and Novaris learning content. Some older statements were imported with general permission claims that have not all been supported by a specific record. That material is preserved for review; its legacy label authorizes no additional copying.</p>
          <p className="section-intro">The <a className="text-link" href="https://maa.org/wp-content/uploads/2024/08/2023_AMC8_Solutions_.pdf" target="_blank" rel="noopener noreferrer">MAA’s 2023 AMC 8 booklet</a> discusses educational sharing with students. Novaris does not treat that as a blanket licence for a public archive. When a paper expressly permits educational web use, its exact conditions and required attribution are recorded separately.</p>
        </div>
      </section>

      <section id="original-work" className="editorial-section scroll-mt-28" aria-labelledby="original-heading">
        <h2 id="original-heading" className="section-heading">Attribution and original learning material</h2>
        <div className="mt-4 space-y-4 text-sm">
          <p className="section-intro">Problem pages should identify the official contest owner and retain public source and answer references. Official contest material must not be presented as Novaris-owned content.</p>
          <p className="section-intro">Explanations should be independently written by Novaris contributors or supplied with an appropriate contributor licence. Novaris-authored practice questions and original diagrams must be clearly distinguished from external contest material.</p>
        </div>
      </section>

      <section id="publication" className="editorial-section scroll-mt-28" aria-labelledby="publication-heading">
        <h2 id="publication-heading" className="section-heading">Publication and corrections</h2>
        <div className="mt-4 space-y-4 text-sm">
          <p className="section-intro">Review records distinguish source checks, answer-key comparisons, independent derivations, and computational checks. New papers are published as complete sets; unresolved problems hold back a set until the issues are addressed.</p>
          <p className="section-intro">Future publication requires separate rights and mathematical reviews, followed by data, formula, image, and page checks. A successful build or format check cannot grant permission or certify a proof.</p>
          <p className="section-intro">When a source, answer, or explanation needs correction, Novaris should update the record and preserve the review history. Please include the problem and the specific issue when reporting a correction.</p>
        </div>
        <Link prefetch={false} href="/contact#corrections" className="text-link mt-4 inline-flex min-h-11 items-center text-sm">Report a source or solution issue →</Link>
      </section>
    </PageShell>
  );
}
