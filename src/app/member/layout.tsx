export default function MemberLayout({ children }: { children: React.ReactNode }) {
  // Member portal shell (auth guard, profile nav) ships in Phase 11.
  return <div className="min-h-screen bg-neutral-50">{children}</div>;
}
