"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/archive", label: "Problem Archive" },
  { href: "/my-learning", label: "My Learning" },
  { href: "/programs", label: "Programs" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const desktopNav = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const active = (href: string) => href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const close = () => dialog.current?.close();

  useEffect(() => { dialog.current?.close(); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [open]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)");
    const onResize = () => { if (desktop.matches && dialog.current?.open) dialog.current.close(); };
    desktop.addEventListener("change", onResize);
    return () => desktop.removeEventListener("change", onResize);
  }, []);

  return (
    <header className="site-header sticky top-0 z-30 border-b border-border bg-paper">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <div className="site-container flex min-h-[72px] items-center justify-between gap-5">
        <Link prefetch={false} href="/" aria-label="Novaris home" className="flex shrink-0 items-center gap-3 py-3">
          <Image src="/novaris-logo.jpg" alt="" width={96} height={44} priority className="h-11 w-24 object-contain" />
          <span className="hidden border-l border-border pl-3 text-xs leading-5 text-muted xl:block">Student-led<br />competition learning</span>
        </Link>
        <nav ref={desktopNav} aria-label="Primary navigation" className="hidden xl:block">
          <ul className="flex items-center gap-x-5">
            {navigation.map(item => <li key={item.href}><Link href={item.href} prefetch={false} aria-current={active(item.href) ? "page" : undefined} className="navigation-link">{item.label}</Link></li>)}
          </ul>
        </nav>
        <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls="mobile-navigation" className="button-secondary xl:hidden"
          onClick={() => { dialog.current?.showModal(); setOpen(true); }}>
          Menu <span aria-hidden="true">☰</span>
        </button>
      </div>
      <dialog ref={dialog} id="mobile-navigation" aria-labelledby="navigation-title" className="navigation-menu"
        onClose={() => {
          setOpen(false);
          if (trigger.current?.getClientRects().length) trigger.current.focus();
          else (desktopNav.current?.querySelector<HTMLAnchorElement>('a[aria-current="page"]') ?? desktopNav.current?.querySelector<HTMLAnchorElement>("a"))?.focus();
        }}
        onKeyDown={event => {
          if (event.key !== "Tab") return;
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter(item => item.getClientRects().length > 0);
          const first = items[0];
          const last = items.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onClick={event => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
        }}>
        <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
          <h2 id="navigation-title" className="font-display text-2xl">Explore Novaris</h2>
          <button type="button" className="button-secondary" onClick={close}>Close <span aria-hidden="true">×</span></button>
        </div>
        <nav aria-label="Mobile primary navigation" className="mt-4">
          <ul className="divide-y divide-border">
            {navigation.map(item => <li key={item.href}><Link href={item.href} prefetch={false} onClick={close} aria-current={active(item.href) ? "page" : undefined} className="navigation-link">{item.label}</Link></li>)}
          </ul>
        </nav>
        <p className="mt-7 border-t border-border pt-5 text-sm leading-6 text-muted">Free competition resources for independent study.</p>
        <Link prefetch={false} href="/contact" onClick={close} className="text-link mt-3 inline-flex min-h-11 items-center text-sm">Contact & corrections →</Link>
      </dialog>
    </header>
  );
}
