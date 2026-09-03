"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

const NAV_LINKS = [
  { href: "/about", label: "About" },
  { href: "/chapters", label: "Chapters" },
  { href: "/members", label: "Members" },
  { href: "/insights", label: "Insights" },
  { href: "/events", label: "Events" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-navy-700/60 bg-navy-950/80 backdrop-blur">
      <Container className="flex h-20 items-center justify-between">
        <Link href="/" className="font-display text-lg tracking-wide text-ivory-100">
          Builders World Forum
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-400 transition-colors hover:text-ivory-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link href="/member" className="text-sm font-medium text-slate-400 hover:text-gold-400">
            Member Login
          </Link>
          <Button href="/chapters" variant="secondary" className="px-5 py-2.5 text-xs">
            Visit BWF
          </Button>
          <Button
            href="/apply"
            variant="primary"
            className="px-5 py-2.5 text-xs"
            onClick={() => trackEvent("become_member_click", { location: "header" })}
          >
            Apply for Membership
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-navy-700 text-ivory-100 lg:hidden"
        >
          <span className="relative block h-3 w-4">
            <span
              className={`absolute left-0 top-0 h-px w-4 bg-current transition-transform ${open ? "translate-y-1.5 rotate-45" : ""}`}
            />
            <span
              className={`absolute left-0 top-1.5 h-px w-4 bg-current transition-opacity ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`absolute left-0 top-3 h-px w-4 bg-current transition-transform ${open ? "-translate-y-1.5 -rotate-45" : ""}`}
            />
          </span>
        </button>
      </Container>

      {open ? (
        <div id="mobile-nav" className="border-t border-navy-700/60 bg-navy-950 lg:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-base font-medium text-ivory-100 hover:bg-navy-800"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/member"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-3 text-base font-medium text-slate-400 hover:bg-navy-800"
            >
              Member Login
            </Link>
            <div className="mt-3 flex flex-col gap-3">
              <Button href="/chapters" variant="secondary" onClick={() => setOpen(false)}>
                Visit BWF
              </Button>
              <Button
                href="/apply"
                variant="primary"
                onClick={() => {
                  setOpen(false);
                  trackEvent("become_member_click", { location: "header_mobile" });
                }}
              >
                Apply for Membership
              </Button>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
