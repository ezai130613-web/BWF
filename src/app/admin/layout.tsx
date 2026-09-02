export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Admin shell (sidebar, auth guard, RBAC checks) ships in Phase 2.
  return <div className="min-h-screen bg-neutral-50">{children}</div>;
}
