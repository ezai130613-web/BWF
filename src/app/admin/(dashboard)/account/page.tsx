import { KeyRound } from "lucide-react";
import { requireAdminSession } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { ChangePasswordForm } from "@/components/admin/change-password-form";

export default async function AdminAccountPage() {
  const session = await requireAdminSession();
  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { name: true, email: true, username: true } });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          <span className="mr-3 inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-800 align-middle text-gold-300 shadow-sm">
            <KeyRound className="h-5 w-5" aria-hidden />
          </span>
          Change password
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Signed in as {user.name}
          {user.email || user.username ? ` (${[user.email, user.username?.toLowerCase()].filter(Boolean).join(" · ")})` : ""}.
        </p>
      </div>
      <div className="max-w-md rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
