/** Same inline `<script type="application/ld+json">` pattern Phase 5 established for Article/FAQPage — just factored out now that Phase 10 adds enough call sites (Organization, Person, LocalBusiness, Event, BreadcrumbList) that repeating the boilerplate stops being the simpler option. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
