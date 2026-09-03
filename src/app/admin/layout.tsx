import { AppSessionProvider } from "@/components/session-provider";

/**
 * Deliberately does NOT inherit the public site's dark navy/gold theme —
 * see docs/ARCHITECTURE.md ("admin panel should not use this design
 * heavily", brief §14). This is just a light-theme reset; the actual admin
 * chrome (sidebar, nav) lives in the (dashboard) route group's layout so
 * /admin/login can render without it.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <AppSessionProvider>{children}</AppSessionProvider>
    </div>
  );
}
