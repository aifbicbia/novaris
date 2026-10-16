import "server-only";
import type { Metadata } from "next";

/** These values are fixed before a production build and confirmed by the owner. */
export function siteOrigin(): URL | undefined {
  const value = process.env.NOVARIS_SITE_URL?.trim();
  if (!value || !/^https:\/\/[^/?#\\\s]+\/?$/i.test(value)) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || !validDomain(url.hostname)) return undefined;
    return new URL(url.origin);
  } catch { return undefined; }
}

function validDomain(value: string): boolean {
  return value.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(value) && !value.endsWith(".localhost");
}

function validatedEmail(value: string | undefined): string | undefined {
  const email = value?.trim();
  if (!email || email.length > 254 || /[^\x21-\x7e]/.test(email)) return undefined;
  const parts = email.split("@");
  if (parts.length !== 2) return undefined;
  const [local, domain] = parts;
  if (local.length > 64 || !/^[A-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i.test(local) || !validDomain(domain)) return undefined;
  return `${local}@${domain.toLowerCase()}`;
}

export function contactEmail(): string | undefined {
  return validatedEmail(process.env.NOVARIS_CONTACT_EMAIL);
}

export function singleLine(value: string, limit = 240): string {
  return value.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").trim().slice(0, limit);
}

/** Preserve the address as data, never as mailto query or fragment syntax. */
export function mailtoHref(address: string, options: { subject?: string; body?: string } = {}): string | undefined {
  const email = validatedEmail(address);
  if (!email) return undefined;
  const encoded = encodeURIComponent(email).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%40/g, "@");
  const params = new URLSearchParams();
  if (options.subject) params.set("subject", singleLine(options.subject));
  if (options.body) params.set("body", options.body.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\r\n?|\n/g, "\n").replace(/\n/g, "\r\n"));
  return `mailto:${encoded}${params.size ? `?${params.toString().replaceAll("+", "%20")}` : ""}`;
}

function publicText(name: string, max = 160): string | undefined {
  const value = process.env[name]?.trim();
  return value && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value) ? value : undefined;
}

export function privacyDetails() {
  const date = process.env.NOVARIS_PRIVACY_UPDATED_AT?.trim();
  const parsed = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : undefined;
  return {
    operator: publicText("NOVARIS_OPERATOR_NAME", 120),
    hosting: publicText("NOVARIS_HOSTING_PROVIDER"),
    contactProvider: publicText("NOVARIS_CONTACT_PROVIDER"),
    contactRetention: publicText("NOVARIS_CONTACT_RETENTION", 600),
    logRetention: publicText("NOVARIS_LOG_RETENTION", 600),
    updatedAt: parsed && !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date ? date : undefined,
  };
}

export const launchEnvironmentKeys = [
  "NOVARIS_SITE_URL", "NOVARIS_CONTACT_EMAIL", "NOVARIS_INDEXING_ENABLED",
  "NOVARIS_OPERATOR_NAME", "NOVARIS_HOSTING_PROVIDER", "NOVARIS_CONTACT_PROVIDER", "NOVARIS_CONTACT_RETENTION",
  "NOVARIS_LOG_RETENTION", "NOVARIS_PRIVACY_UPDATED_AT", "NOVARIS_PRIVACY_REVIEWED",
] as const;

export function launchStatus() {
  const privacy = privacyDetails();
  const values: Record<string, unknown> = {
    NOVARIS_SITE_URL: siteOrigin(), NOVARIS_CONTACT_EMAIL: contactEmail(),
    NOVARIS_OPERATOR_NAME: privacy.operator, NOVARIS_HOSTING_PROVIDER: privacy.hosting,
    NOVARIS_CONTACT_PROVIDER: privacy.contactProvider, NOVARIS_LOG_RETENTION: privacy.logRetention,
    NOVARIS_CONTACT_RETENTION: privacy.contactRetention,
    NOVARIS_PRIVACY_UPDATED_AT: privacy.updatedAt,
  };
  const invalid = Object.entries(values).filter(([key, value]) => process.env[key]?.trim() && !value).map(([key]) => key);
  for (const key of ["NOVARIS_INDEXING_ENABLED", "NOVARIS_PRIVACY_REVIEWED"]) {
    const value = process.env[key]?.trim();
    if (value && value !== "true" && value !== "false") invalid.push(key);
  }
  const missing = Object.entries(values).filter(([, value]) => !value).map(([key]) => key);
  if (process.env.NOVARIS_PRIVACY_REVIEWED?.trim() !== "true") missing.push("NOVARIS_PRIVACY_REVIEWED");
  const indexingRequested = process.env.NOVARIS_INDEXING_ENABLED?.trim() === "true";
  return { missing, invalid, indexingRequested, canIndex: indexingRequested && !missing.length && !invalid.length };
}

export function indexingAllowed(): boolean {
  return launchStatus().canIndex;
}

export function socialMetadata(): Pick<Metadata, "openGraph" | "twitter"> {
  const origin = siteOrigin();
  const images = origin ? [{ url: new URL("/opengraph-image", origin).href, width: 1200, height: 630, alt: "Novaris competition study resources" }] : undefined;
  return {
    openGraph: { type: "website", siteName: "Novaris", ...(images ? { images } : {}) },
    twitter: { card: "summary_large_image", ...(images ? { images } : {}) },
  };
}

export function pageMetadata(title: string, description: string, path: string, options: { index?: boolean } = {}): Metadata {
  if (!/^\/(?!\/)/.test(path) || /[?#\\\s\u0000-\u001f\u007f]/.test(path)) throw new Error("Canonical paths must be internal paths without whitespace, controls, queries or fragments.");
  const origin = siteOrigin();
  const canonical = origin ? new URL(path, origin) : undefined;
  if (canonical && canonical.origin !== origin?.origin) throw new Error("Canonical URLs must retain the configured origin.");
  const social = socialMetadata();
  const index = indexingAllowed() && options.index !== false && !["/my-learning", "/tutors", "/discussion", "/blog"].includes(path);
  return {
    title: path === "/" ? { absolute: `${title} | Novaris` } : title, description,
    robots: { index, follow: indexingAllowed() },
    ...(canonical ? { alternates: { canonical: canonical.href } } : {}),
    openGraph: { ...social.openGraph, title: `${title} | Novaris`, description, ...(canonical ? { url: canonical.href } : {}) },
    twitter: { ...social.twitter, title: `${title} | Novaris`, description },
  };
}
