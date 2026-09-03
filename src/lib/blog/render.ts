import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ gfm: true, breaks: false });

/**
 * Blog content is trusted admin-authored Markdown (see Blog.content's schema
 * comment) — even the future member-submission path stays behind admin
 * approval before publishing, so this was never run against unreviewed user
 * input in the sense of "a stranger's raw submission." Sanitized anyway as
 * of Phase 14's production security review (brief §55 — XSS protection is a
 * mandatory requirement, not a conditional one): `marked` passes raw HTML
 * embedded in Markdown straight through with no escaping, so a compromised
 * admin session (phishing, credential stuffing — the trust boundary is the
 * session, not the person) could otherwise inject a stored XSS served to
 * every public visitor. This is defense-in-depth on top of the original
 * reasoning, not a reversal of it.
 */
const ALLOWED_TAGS = [
  ...sanitizeHtml.defaults.allowedTags,
  "img",
  "h1",
  "h2",
  "figure",
  "figcaption",
];

export function renderMarkdown(markdown: string) {
  const html = marked.parse(markdown, { async: false });
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title"],
      a: ["href", "name", "target", "rel"],
    },
  });
}
