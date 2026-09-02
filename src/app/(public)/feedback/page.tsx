import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/container";
import { SectionLabel } from "@/components/ui/section-label";
import { FeedbackForm } from "@/components/marketing/feedback-form";

export const metadata: Metadata = {
  title: "Feedback",
  description: "Share feedback with Builders World Forum management.",
};

export default async function FeedbackPage() {
  const chapters = await db.chapter.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } });

  return (
    <div className="py-24">
      <Container className="max-w-xl">
        <SectionLabel>Feedback</SectionLabel>
        <h1 className="mt-4 font-display text-4xl text-ivory-100 sm:text-5xl">
          Tell us what&rsquo;s on your mind.
        </h1>
        <p className="mt-4 text-slate-400">
          Meeting feedback, event feedback, or anything for BWF management — this goes straight
          to the team, not published anywhere.
        </p>
        <div className="mt-10">
          <FeedbackForm chapters={chapters} />
        </div>
      </Container>
    </div>
  );
}
