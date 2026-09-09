import { getContent } from "@/lib/content";
import { toCrores } from "@/lib/format";
import { Container } from "@/components/ui/container";
import { BusinessGeneratedCounter } from "@/components/marketing/business-generated-counter";

export async function BusinessGeneratedSection() {
  const content = await getContent(["stats.businessGeneratedInr", "stats.businessGeneratedUpdatedAt"]);
  const raw = content["stats.businessGeneratedInr"];
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;

  return (
    <section className="border-y border-emerald-700 bg-emerald-950 py-20">
      <Container>
        <BusinessGeneratedCounter crores={toCrores(n)} updatedAsOf={content["stats.businessGeneratedUpdatedAt"]} />
      </Container>
    </section>
  );
}
