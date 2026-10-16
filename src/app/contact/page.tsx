import { contactEmail, mailtoHref, pageMetadata, singleLine } from "@/lib/site-config";
import { PageHeader, PageShell, Panel } from "@/components/site-ui";
import { CopyEmail } from "@/components/copy-email";

export const metadata = pageMetadata("Contact", "Contact information for Novaris corrections and contributions.", "/contact");
const contacts = [
  {
    id: "corrections",
    title: "Source corrections",
    body: "Include the contest, year, problem number, and the step or source that needs checking. A supporting reference or calculation helps us understand the issue.",
    subject: "Novaris Source Correction",
  },
  {
    id: "contributions",
    title: "Content contributions",
    body: "Share an original explanation or suggest a paper for the archive. Include source links and the display permissions for any material you contribute.",
    subject: "Novaris Content Contribution",
  },
  {
    id: "tutoring",
    title: "Tutoring enquiries",
    body: "Introduce your teaching subjects, experience, and preferred format. Peer tutoring and study groups are planned; enquiries are expressions of interest, not applications or bookings.",
    subject: "Novaris Tutoring Enquiry",
  },
  {
    id: "feedback",
    title: "Feedback & collaboration",
    body: "Describe the page or interaction you would improve, or the learning need a possible collaboration could address.",
    subject: "Novaris Feedback and Collaboration",
  },
];
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ problem?: string | string[] }>;
}) {
  const email = contactEmail();
  const value = (await searchParams).problem;
  const problem = typeof value === "string" ? singleLine(value, 200) : "";
  return (
    <PageShell aside={
      <Panel title="Email contacts">
        <dl className="space-y-5 text-sm">
          {email ? <div><dt className="text-xs text-muted">Corrections and enquiries</dt><dd className="mt-1 break-words"><a href={mailtoHref(email)} className="text-link">{email}</a><CopyEmail email={email} /></dd></div> : <div><dt className="font-semibold text-navy">Contact details pending</dt><dd className="mt-2 leading-6 text-muted">A confirmed address will be listed here before public launch.</dd></div>}
        </dl>
        <p className="mt-5 text-xs leading-6 text-muted">
          {email ? "If an email app does not open, copy the address into your usual email service." : "No contact form or placeholder mailbox receives messages from this page."}
        </p>
      </Panel>
    }>
      <PageHeader
        eyebrow="Get in touch"
        title="Contact"
        description="Help improve a solution, contribute an explanation, or share an idea for the project."
      />
      <p className="section-intro mb-7 text-sm">
        {email ? "Choose a topic to open an email draft. This website does not receive form submissions." : "Contact details are being finalised. The topics below explain what to include once a confirmed address is available."}
      </p>
      {problem ? (
        <p className="mb-7 break-words border-l-2 border-gold pl-4 text-sm leading-6 text-muted">
          Your correction draft includes: <strong className="text-navy">{problem}</strong>.
          {" "}Add the issue and any supporting reasoning before sending.
        </p>
      ) : null}
      <div className="divide-y divide-border border-y border-border">
        {contacts.map((item) => {
          const body =
            item.id === "corrections" && problem
              ? `Problem: ${problem}\n\nIssue or correction:\n\nSupporting source or reasoning:\n`
              : "";
          const mail = email ? mailtoHref(email, {
            subject: `${item.subject}${item.id === "corrections" && problem ? ` — ${problem}` : ""}`,
            ...(body ? { body } : {}),
          }) : undefined;
          return (
            <section
              id={item.id}
              key={item.id}
              className="scroll-mt-28 py-6"
            >
              <h2 className="section-heading">{item.title}</h2>
              <div className="mt-2">
                <p className="section-intro text-sm">{item.body}</p>
                {mail ? <a
                  href={mail}
                  className="text-link mt-2 inline-flex min-h-11 items-center text-sm"
                >
                  {item.id === "corrections" ? "Open correction email" : item.id === "contributions" ? "Open contribution email" : item.id === "tutoring" ? "Open tutoring enquiry" : "Open feedback email"}
                  <span className="ml-1" aria-hidden="true">↗</span>
                  <span className="sr-only"> to {email}</span>
                </a> : <p className="mt-3 text-xs text-muted">Contact details coming soon.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}
