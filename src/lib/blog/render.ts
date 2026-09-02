import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

/**
 * Blog content is trusted admin-authored Markdown (see Blog.content's schema
 * comment) — even the future member-submission path stays behind admin
 * approval before publishing, so this is never run against unreviewed user
 * input and doesn't need HTML sanitization on top of it.
 */
export function renderMarkdown(markdown: string) {
  return marked.parse(markdown, { async: false });
}
