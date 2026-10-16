"use client";

import { useState } from "react";

/** Copy only the published address; enquiries are sent by the reader's email app. */
export function CopyEmail({ email }: { email: string }) {
  const [message, setMessage] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setMessage("Email address copied.");
    } catch {
      setMessage("Copy unavailable. Select the email address above to copy it manually.");
    }
  }
  return (
    <div className="mt-2">
      <button type="button" className="text-link min-h-11 text-xs" onClick={copy} aria-label={`Copy ${email}`}>
        Copy email address
      </button>
      <p role="status" aria-live="polite" className="text-xs leading-5 text-muted">{message}</p>
    </div>
  );
}
