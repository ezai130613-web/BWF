import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function MemberLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <Image src="/images/brand/bwf-logo-512.png" alt="Builders World Forum" width={44} height={44} className="h-11 w-11" priority />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-800">Builders World Forum</p>
            <h1 className="text-lg font-semibold text-neutral-900">Member sign in</h1>
          </div>
        </div>
        <p className="mt-3 text-sm text-neutral-500">
          First time? Use the username and temporary password BWF gave you.
        </p>
        <div className="mt-6">
          <Suspense fallback={null}>
            <LoginForm
              providerId="member-login"
              defaultRedirectTo="/member"
              forgotPasswordUrl="/member/reset-password"
              memberVariant
            />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
