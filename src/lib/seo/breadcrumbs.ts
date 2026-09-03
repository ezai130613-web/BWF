import { SITE_URL } from "@/lib/site";

/** Brief §53 — BreadcrumbList. `path` is site-relative (e.g. "/chapters/chapter-01"); resolved to an absolute URL here since JSON-LD `item` values must be absolute. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
