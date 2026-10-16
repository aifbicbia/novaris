"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page-shell">
      <section className="max-w-2xl" aria-labelledby="error-title" role="alert">
        <p className="eyebrow">Unable to load this page</p>
        <h1 id="error-title" className="page-heading mt-3">Something interrupted your visit.</h1>
        <p className="section-intro mt-4">Try loading the page again, or return to the archive.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="button-primary" onClick={reset}>Try again</button>
          <Link prefetch={false} href="/archive" className="button-secondary">Go to the archive →</Link>
        </div>
      </section>
    </div>
  );
}
