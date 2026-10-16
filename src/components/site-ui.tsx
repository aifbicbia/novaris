import Link from "next/link";
import type { ReactNode } from "react";
import type { Difficulty, Subject } from "@/data/schema";
import { keyIdeaLabel } from "@/lib/key-idea-labels";

type LinkItem = {
  href: string;
  label: string;
  icon?: string;
  caption?: string;
};

export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border py-5">
      <h2 className="font-display mb-4 text-xl text-navy">{title}</h2>
      {children}
    </section>
  );
}

export function LinkList({ items }: { items: LinkItem[] }) {
  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <Link prefetch={false}
          key={`${item.href}-${item.label}`}
          href={item.href}
          className="group flex min-h-11 items-center justify-between gap-3 py-3 text-sm text-blue"
        >
          <span>
            <span className="font-semibold group-hover:underline">
              {item.label}
            </span>
            {item.caption ? (
              <span className="mt-1 block text-xs text-muted">
                {item.caption}
              </span>
            ) : null}
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      ))}
    </div>
  );
}

export function IconBubble({
  children,
  tone = "blue",
  className = "",
}: {
  children: ReactNode;
  tone?: "blue" | "gold" | "plain";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center font-display text-xl ${tone === "gold" ? "text-gold" : "text-blue"} ${className}`}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-6 max-w-3xl sm:mb-8">
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <h1 className="page-heading">
        {title}
      </h1>
      <p className="section-intro mt-3 text-base">
        {description}
      </p>
    </header>
  );
}

export function PageShell({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div
      className={`page-shell ${aside ? "grid gap-10 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-14" : ""}`}
    >
      <div>{children}</div>
      {aside ? <aside>{aside}</aside> : null}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link prefetch={false}
      href={href}
      className={secondary ? "button-secondary" : "button-primary"}
    >
      {children}
    </Link>
  );
}

export function StatusNotice({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8 border-l-2 border-gold bg-gold-soft/50 px-5 py-4">
      <h2 className="text-sm font-semibold text-navy">{title}</h2>
      <div className="mt-2 max-w-3xl text-sm leading-6 text-muted">
        {children}
      </div>
    </section>
  );
}

export function DifficultyDots({ difficulty }: { difficulty: Difficulty }) {
  const score = { Introductory: 1, Intermediate: 2, Advanced: 3, Olympiad: 4 }[
    difficulty
  ];
  return (
    <span
      className="inline-flex items-center gap-1"
      role="img"
      aria-label={`${difficulty} difficulty`}
    >
      {Array.from({ length: 4 }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 w-1.5 rounded-full ${index < score ? "bg-gold" : "bg-border"}`}
        />
      ))}
    </span>
  );
}

export function subjectIcon(subject: Subject) {
  return subject === "Math" ? "Σ" : subject === "Physics" ? "∿" : "</>";
}

export const categoryLinks: LinkItem[] = [
  { href: "/archive?subject=Math", label: "Mathematics" },
  { href: "/programs#physics", label: "Physics", caption: "Planned" },
  { href: "/programs#cs", label: "Computer science", caption: "Planned" },
  { href: "/blog", label: "Study notes", caption: "Preview" },
  { href: "/tutors", label: "Peer tutoring", caption: "Coming soon" },
  { href: "/discussion", label: "Discussion", caption: "Coming soon" },
];
export const quickLinks: LinkItem[] = [
  { href: "/archive", label: "Browse problems" },
  { href: "/tutors", label: "Tutor programme preview" },
  { href: "/discussion", label: "Community plans" },
];
export const archiveQuickLinks: LinkItem[] = [
  { href: "/archive?contest=AMC%208&year=2024", label: "2024 AMC 8" },
  { href: "/archive?contest=AMC%2010A&year=2024", label: "2024 AMC 10A" },
  { href: "/archive?topic=Geometry", label: "Geometry practice" },
  { href: "/contact", label: "Report a correction" },
];

export function TagCloud({
  tags,
  parameter = "topic",
}: {
  tags: string[];
  parameter?: "topic" | "idea";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`/archive?${parameter}=${encodeURIComponent(tag)}`}
          prefetch={false}
          className="tag"
        >
          {parameter === "idea" ? keyIdeaLabel(tag) : tag}
        </Link>
      ))}
    </div>
  );
}
