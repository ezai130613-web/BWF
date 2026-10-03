import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { ADMIN_ROLE_KEYS } from "@/lib/auth/constants";
import { db } from "@/lib/db";
import { getBooleanSetting } from "@/lib/settings";
import { ActivateAccountForm } from "@/components/auth/activate-account-form";
import { SignOutButton } from "@/components/sign-out-button";

/** First sign-in for an admin login issued with a temporary password (2026-10-03). */
export default async function AdminActivatePage() {
  const session = await auth();
  if (!session?.user || !session.user.roles.some((r) => ADMIN_ROLE_KEYS.includes(r))) redirect("/admin/login");
  const user = await db.user.findUniqueOrThrow({ where: { id: session.user.id } });
  if (!user.mustChangePassword) redirect("/admin");

  const requireCode = await getBooleanSetting("memberActivation.requireEmailCode");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <Image src="/images/brand/bwf-logo-512.png" alt="Builders World Forum" width={44} height={44} className="h-11 w-11" priority />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-800">BWF Admin</p>
            <h1 className="text-lg font-semibold text-neutral-900">Secure your admin login</h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-neutral-600">
          Welcome, {user.name}. You signed in with a temporary password. Add your email
          {requireCode ? " (we'll send a code to confirm it)" : ""} and choose your own password to continue. After this,
          sign in with your email or username and your new password.
        </p>
        <div className="mt-6">
          <ActivateAccountForm requireCode={requireCode} username={user.username} providerId="admin-login" destination="/admin" offerRemember={false} />
        </div>
        <div className="mt-6 border-t border-neutral-100 pt-4 text-right">
          <SignOutButton callbackUrl="/admin/login" />
        </div>
      </div>
    </main>
  );
}
