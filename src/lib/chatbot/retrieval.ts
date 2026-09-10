import { db } from "@/lib/db";
import { getContent } from "@/lib/content";
import { publiclyVisibleBlogWhere } from "@/lib/blog/query";

/**
 * Structured-DB-search retrieval for the Ask BWF chatbot (brief §36) — no
 * vector embeddings, plain Prisma `contains`/`insensitive` queries mirroring
 * the existing member-directory search (src/app/(public)/members/page.tsx).
 *
 * Split into two functions rather than one, so the caller (src/lib/chatbot/
 * prompt.ts) can put the baseline half behind a prompt-cache breakpoint —
 * chapters/categories/FAQs/content barely change between messages in the
 * same conversation, while the keyword-matched half is genuinely
 * per-message. Both only ever touch public content (Chapter/Category/
 * Member/Blog/SiteFaq/WebsiteContent) and only their public columns —
 * Feedback, MembershipApplication, User, AuditLog, MemberProfileRevision,
 * and the WeeklyReport* tables are never queried here.
 */
export async function getBaselineChatbotContext(): Promise<string> {
  const [chapters, categories, faqs, content] = await Promise.all([
    db.chapter.findMany({
      where: { status: "ACTIVE" },
      select: { name: true, description: true, location: true, meetingSchedule: true, meetingVenue: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      where: { isActive: true },
      select: { name: true, description: true },
      orderBy: { name: "asc" },
    }),
    db.siteFaq.findMany({
      where: { isActive: true },
      select: { question: true, answer: true },
      orderBy: { order: "asc" },
    }),
    getContent(["about.intro", "contact.phone", "contact.email", "contact.address", "footer.tagline"]),
  ]);

  const sections: string[] = [];

  const contentLines: string[] = [];
  if (content["about.intro"]) contentLines.push(`About BWF: ${content["about.intro"]}`);
  if (content["footer.tagline"]) contentLines.push(`Tagline: ${content["footer.tagline"]}`);
  if (content["contact.phone"]) contentLines.push(`Phone: ${content["contact.phone"]}`);
  if (content["contact.email"]) contentLines.push(`Email: ${content["contact.email"]}`);
  if (content["contact.address"]) contentLines.push(`Address: ${content["contact.address"]}`);
  if (contentLines.length > 0) {
    sections.push(`## About Builders World Forum\n${contentLines.join("\n")}`);
  }

  if (chapters.length > 0) {
    sections.push(
      `## Chapters\n${chapters
        .map(
          (c) =>
            `- ${c.name}${c.location ? ` (${c.location})` : ""}${c.description ? `: ${c.description}` : ""}${c.meetingSchedule ? ` — meets ${c.meetingSchedule}` : ""}`,
        )
        .join("\n")}`,
    );
  }

  if (categories.length > 0) {
    sections.push(`## Categories\n${categories.map((c) => `- ${c.name}${c.description ? `: ${c.description}` : ""}`).join("\n")}`);
  }

  if (faqs.length > 0) {
    sections.push(`## Frequently Asked Questions\n${faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}`);
  }

  return sections.join("\n\n");
}

/**
 * Common English filler words plus a few site-specific ones ("bwf",
 * "member(s)") that appear in almost every visitor question and would
 * otherwise match nothing usefully — stripping them turns a full sentence
 * like "Bath fittings member?" into meaningful search terms ("bath",
 * "fittings") instead of one literal phrase that has to appear verbatim in
 * a member/category field to match.
 */
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "am", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
  "us", "them", "my", "your", "his", "its", "our", "their",
  "this", "that", "these", "those",
  "and", "or", "but", "if", "then", "so", "because", "as", "of", "at",
  "by", "for", "with", "about", "against", "between", "into", "through",
  "during", "before", "after", "above", "below", "to", "from", "up",
  "down", "in", "out", "on", "off", "over", "under", "again", "further",
  "once", "here", "there", "when", "where", "why", "how", "all", "any",
  "both", "each", "few", "more", "most", "other", "some", "such", "no",
  "nor", "not", "only", "own", "same", "than", "too", "very",
  "can", "will", "just", "don", "should", "now", "do", "does", "did",
  "have", "has", "had", "having", "what", "which", "who", "whom",
  "please", "hi", "hello", "hey", "thanks", "thank", "want", "need",
  "looking", "know", "tell", "give", "get", "find", "member", "members",
  "bwf",
]);

function extractKeywords(query: string): string[] {
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
  return Array.from(new Set(words));
}

export async function getKeywordMatchedChatbotContext(query: string): Promise<string> {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return "";

  const [members, blogs] = await Promise.all([
    db.member.findMany({
      where: {
        status: "ACTIVE",
        chapter: { status: "ACTIVE" },
        OR: keywords.flatMap((keyword) => [
          { name: { contains: keyword, mode: "insensitive" as const } },
          { company: { name: { contains: keyword, mode: "insensitive" as const } } },
          { services: { contains: keyword, mode: "insensitive" as const } },
          { specialisations: { contains: keyword, mode: "insensitive" as const } },
          { usp: { contains: keyword, mode: "insensitive" as const } },
          { areasServed: { contains: keyword, mode: "insensitive" as const } },
          { certifications: { contains: keyword, mode: "insensitive" as const } },
          { category: { name: { contains: keyword, mode: "insensitive" as const } } },
        ]),
      },
      select: {
        name: true,
        slug: true,
        designation: true,
        services: true,
        specialisations: true,
        usp: true,
        areasServed: true,
        company: { select: { name: true } },
        chapter: { select: { name: true } },
        category: { select: { name: true } },
      },
      take: 8,
    }),
    db.blog.findMany({
      where: {
        ...publiclyVisibleBlogWhere,
        OR: keywords.flatMap((keyword) => [
          { title: { contains: keyword, mode: "insensitive" as const } },
          { excerpt: { contains: keyword, mode: "insensitive" as const } },
        ]),
      },
      select: { title: true, slug: true, excerpt: true },
      take: 3,
    }),
  ]);

  const sections: string[] = [];

  if (members.length > 0) {
    sections.push(
      `## Matching Members\n${members
        .map(
          (m) =>
            `- ${m.name} (${m.category.name}, ${m.chapter.name}) — ${m.company.name}${m.designation ? `, ${m.designation}` : ""}${m.services ? `. Services: ${m.services}` : ""}${m.specialisations ? `. Specialisations: ${m.specialisations}` : ""}${m.usp ? `. ${m.usp}` : ""} [View ${m.name}'s profile](/members/${m.slug})`,
        )
        .join("\n")}`,
    );
  }

  if (blogs.length > 0) {
    sections.push(
      `## Related Insights\n${blogs.map((b) => `- ${b.title}${b.excerpt ? `: ${b.excerpt}` : ""} [Read more](/insights/${b.slug})`).join("\n")}`,
    );
  }

  return sections.join("\n\n");
}
