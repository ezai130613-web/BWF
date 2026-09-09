"use client";

import { useState } from "react";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";

type Term = {
  name: string;
  question: string;
  summary: string;
  detail: React.ReactNode;
  formula: string;
};

const TERMS: Term[] = [
  {
    name: "Referral",
    question: "What is a Referral?",
    summary: "A genuine business opportunity one BWF member creates for another member.",
    detail: (
      <>
        <p>
          <strong className="text-ivory-100">Outside Referral</strong> — you connect another BWF
          member with someone from your personal or professional network who needs their
          product or service. <em>Example: your friend needs plumbing materials, so you introduce
          them to the BWF plumbing-material member.</em>
        </p>
        <p className="mt-3">
          <strong className="text-ivory-100">Self / Inside Referral</strong> — you personally need
          another member&rsquo;s product or service and purchase from them.{" "}
          <em>Example: you need plumbing materials for your own project and buy them from the BWF
          plumbing-material member.</em>
        </p>
      </>
    ),
    formula: "Referral = Opportunity Given",
  },
  {
    name: "Thank You Slip",
    question: "What is a Thank You Slip?",
    summary: "Records business successfully generated through a BWF referral.",
    detail: (
      <p>
        Example: Member A introduces Member B to HR Groups. HR Groups places an order worth
        ₹2,00,000 with Member B. Member B records a ₹2,00,000 Thank You Slip to Member A.
      </p>
    ),
    formula: "Thank You Slip = Business Successfully Generated",
  },
  {
    name: "One-to-One",
    question: "What is a One-to-One?",
    summary: "A dedicated meeting between two BWF members outside the regular chapter meeting.",
    detail: (
      <p>
        The chapter meeting gives members limited time — a One-to-One lets two members understand
        each other deeply: company, products/services, ideal customers, projects, referral
        opportunities, business goals, and personal background.
      </p>
    ),
    formula: "2 Members + Deeper Relationship = One-to-One",
  },
  {
    name: "Power Date",
    question: "What is a Power Date?",
    summary: "A BWF member takes one or more fellow members to meet their external connection.",
    detail: (
      <p>
        Example: you personally know the management of VS Hospital. You take two BWF members to
        meet the VS Hospital team — that meeting becomes a Power Date.
      </p>
    ),
    formula: "BWF Member + Fellow Member(s) + External Connection = Power Date",
  },
  {
    name: "Conclave",
    question: "What is a Conclave?",
    summary: "Three or more BWF members meeting together outside the regular chapter meeting.",
    detail: (
      <p>
        May happen at a member&rsquo;s office, a project location, a business venue, or another
        suitable location. Members discuss their businesses, referral possibilities,
        opportunities, collaborations, and how they can support one another.
      </p>
    ),
    formula: "3+ BWF Members Meeting Together = Conclave",
  },
];

export function Terminology() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-emerald-900 py-24">
      <Container>
        <SectionLabel>BWF Terminology</SectionLabel>
        <div className="mt-10 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TERMS.map((term, i) => {
            const isOpen = openIndex === i;
            return (
              <button
                key={term.name}
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                className={`rounded-sm border p-6 text-left transition-colors ${
                  isOpen ? "border-gold-500/60 bg-emerald-800" : "border-emerald-700 hover:border-gold-500/40"
                }`}
              >
                <p className="font-display text-xl text-ivory-100">{term.name}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{term.summary}</p>
                {isOpen ? (
                  <div className="mt-4 border-t border-emerald-700 pt-4 text-sm leading-relaxed text-slate-300">
                    {term.detail}
                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gold-400">
                      {term.formula}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gold-500/80">
                    Tap to read more
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
