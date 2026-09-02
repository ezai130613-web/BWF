import { Container } from "@/components/ui/container";

export function StatementBanner({ lines }: { lines: string[] }) {
  return (
    <section className="border-y border-navy-700 bg-navy-950 py-24">
      <Container>
        <p className="font-display text-4xl leading-[1.1] text-ivory-100 sm:text-6xl lg:text-7xl">
          {lines.map((line, i) => (
            <span key={line} className={i % 2 === 1 ? "block text-gold-500" : "block"}>
              {line}
            </span>
          ))}
        </p>
      </Container>
    </section>
  );
}
