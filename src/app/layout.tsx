import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { indexingAllowed, siteOrigin, socialMetadata } from "@/lib/site-config";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  ...(siteOrigin() ? { metadataBase: siteOrigin() } : {}),
  title: {
    default: "Novaris — Competition learning",
    template: "%s | Novaris",
  },
  description:
    "Student-led competition learning. Browse sourced contest problems and original Novaris explanations for independent study.",
  robots: { index: indexingAllowed(), follow: indexingAllowed() },
  ...socialMetadata(),
  openGraph: { ...socialMetadata().openGraph, title: "Novaris — Competition learning", description: "Sourced contest problems and reasoned explanations for independent study." },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main id="main-content" tabIndex={-1} className="flex-1">
          {children}
        </main>
        <footer className="site-footer border-t border-border bg-paper">
          <div className="site-container grid gap-8 py-9 md:grid-cols-[1fr_auto]">
            <div>
              <Link prefetch={false} href="/" className="font-display text-2xl text-navy">
                Novaris
              </Link>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted">
                Mathematics, physics and programming
                competition resources.
              </p>
              <p className="mt-3 text-xs text-muted">
                Contest materials belong to their respective owners.
                <br />
                Novaris provides independently written explanations.
              </p>
            </div>
            <nav
              aria-label="Footer navigation"
              className="grid grid-cols-2 content-start gap-x-10 gap-y-1 text-sm text-muted"
            >
              {[
                ["/archive", "Problem Archive"],
                ["/my-learning", "My Learning"],
                ["/about", "About Novaris"],
                ["/programs", "Programs"],
                ["/source-policy", "Source Policy"],
                ["/contact", "Contact"],
                ["/guide", "Study guide"],
                ["/privacy", "Privacy"],
              ].map(([href, label]) => (
                <Link key={href} href={href} prefetch={false} className="flex min-h-11 items-center hover:text-blue hover:underline">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="site-container pb-5 text-xs text-muted">
            © 2026 Novaris · Built for independent study
          </div>
        </footer>
      </body>
    </html>
  );
}
