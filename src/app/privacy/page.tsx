import Link from "next/link";
import { PageHeader, PageShell } from "@/components/site-ui";
import { contactEmail, mailtoHref, pageMetadata, privacyDetails } from "@/lib/site-config";

export const metadata = pageMetadata("Privacy", "How Novaris uses browser storage and handles external links.", "/privacy");

export default function PrivacyPage() {
  const details = privacyDetails();
  const email = contactEmail();
  return <PageShell>
    <PageHeader eyebrow="Using the website" title="Privacy" description="What the current website stores, and what stays in your browser." />
    <p className="mb-6 text-sm text-muted">{details.updatedAt ? <>Last updated: <time dateTime={details.updatedAt}>{details.updatedAt}</time>.</> : "Publication details are being confirmed before public launch."}</p>
    <section className="editorial-section">
      <h2 className="section-heading">Your learning lists</h2>
      <p className="section-intro mt-3">Bookmarks, Review Later and Completed marks are stored in this browser using local storage. They are not sent to a Novaris account or synchronised across devices. Clearing site data removes those saved lists. If storage is unavailable, the current tab can keep a temporary list.</p>
      <p className="section-intro mt-3">The storage key is <code>novaris.learning.v1</code>. To remove these lists, clear this website’s site data in your browser settings. This also removes your saved progress. A different browser, device or website origin has separate storage.</p>
    </section>
    <section className="editorial-section">
      <h2 className="section-heading">Search and links</h2>
      <p className="section-intro mt-3">Archive searches and filters appear in the page address. Anyone receiving a shared address can see those search terms, and a request for that address may appear in hosting logs. Avoid entering private information. Original papers open on external websites, whose privacy practices apply there. Following a source link sends a request to that external website.</p>
    </section>
    <section className="editorial-section">
      <h2 className="section-heading">Messages and enquiries</h2>
      <p className="section-intro mt-3">The website has no message-submission form, account registration, payment system or advertising tracker. Contact links, when available, open your email service; no message is sent until you choose to send it. The receiving address, subject and draft text are visible in your email app.</p>
      <p className="section-intro mt-3">{details.contactProvider ? <>The published receiving email service is {details.contactProvider}. </> : "The receiving email service will be confirmed before public launch. "}Messages pass through the email services involved. For a correction, include the problem reference and relevant reasoning; avoid sending unnecessary personal or sensitive information.</p>
      <p className="section-intro mt-3">{details.contactRetention ? <>Enquiry retention: {details.contactRetention}</> : "How long enquiries are retained will be confirmed before public launch."}</p>
    </section>
    <section className="editorial-section">
      <h2 className="section-heading">Hosting and connection information</h2>
      <p className="section-intro mt-3">Delivering a page involves connection information such as an IP address, request time, requested address and browser information. The selected hosting service determines which delivery logs are retained. Browser learning lists are separate and are not uploaded by the application.</p>
      <dl className="mt-5 space-y-4 text-sm">
        <div><dt className="font-semibold text-navy">Hosting provider</dt><dd className="section-intro mt-1 break-words">{details.hosting ?? "Not yet confirmed for public launch."}</dd></div>
        <div><dt className="font-semibold text-navy">Delivery log retention</dt><dd className="section-intro mt-1 break-words">{details.logRetention ?? "To be confirmed against the selected hosting settings before public launch."}</dd></div>
      </dl>
    </section>
    <section className="editorial-section">
      <h2 className="section-heading">Project contact and privacy enquiries</h2>
      <p className="section-intro mt-3">{details.operator ? <>Published project contact: {details.operator}.</> : "The project operator’s public contact details are being confirmed."}</p>
      <p className="section-intro mt-3">{email ? <>For a privacy question, or a request concerning an enquiry you have sent, email <a className="text-link break-words" href={mailtoHref(email, { subject: "Novaris Privacy Enquiry" })}>{email}</a>. Describe the request without including more personal information than needed.</> : "A confirmed privacy enquiry address will be published here before public launch."}</p>
      <Link prefetch={false} href="/contact" className="text-link mt-4 inline-flex min-h-11 items-center">Contact information →</Link>
    </section>
  </PageShell>;
}
