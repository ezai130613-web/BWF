import { AppSessionProvider } from "@/components/session-provider";

/**
 * No auth check here — mirrors src/app/admin/layout.tsx exactly, so
 * /member/login can render without a session. The actual guard lives in
 * the (portal) route group's layout, sibling to /member/login.
 */
export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <AppSessionProvider>{children}</AppSessionProvider>
    </div>
  );
}
