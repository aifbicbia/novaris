import Link from "next/link";
import { PageHeader, PageShell } from "@/components/site-ui";
import { pageMetadata } from "@/lib/site-config";

export const metadata = pageMetadata("Study guide", "How to find a paper, read explanations and organise practice on Novaris.", "/guide");
const questions = [
  ["How do I find a complete paper?", "Choose a contest and year in Problem Archive. On a problem page, View this paper returns to its exact sitting. Historical rounds can have different numbers of tasks."],
  ["Why does a statement open elsewhere?", "Read here means the statement can be displayed on Novaris. Statement at source means you need to open the linked original. Available explanations stay here. A recorded substantive conflict displays a solution-review notice. Public access to a paper does not itself establish permission to copy it."],
  ["What do review labels mean?", "Review documented indicates a recorded answer comparison and independent check. Further review means the available evidence is less complete or an issue is still open. These labels do not guarantee that every explanation is error-free."],
  ["How are my lists saved?", "Use Bookmark, Review Later and Completed independently. My Learning keeps these choices in this browser. Reading an answer does not automatically mark a problem completed, and there is no cross-device account sync."],
  ["Can I use the reference code online?", "Check the original task’s input and output instructions. Older USACO tasks often use named files; their Novaris reference programs retain that historical format. Long code lines scroll inside the code block."],
  ["Are courses or tutoring open?", "The archive is available for independent practice. Enrolment, tutor bookings and live discussion are not available; planned services are labelled Coming Soon."],
];

export default function GuidePage() {
  return <PageShell>
    <PageHeader eyebrow="Getting started" title="A guide to your practice" description="Find a paper, try the problem, and return to the ideas you want to review." />
    <div className="divide-y divide-border border-y border-border">
      {questions.map(([question,answer]) => <section className="py-6" key={question}><h2 className="section-heading">{question}</h2><p className="section-intro mt-3">{answer}</p></section>)}
    </div>
    <Link prefetch={false} href="/archive" className="button-primary mt-7 inline-flex">Choose a paper →</Link>
  </PageShell>;
}
