import { Suspense } from "react";
import { OtpLoginForm } from "@/components/auth/otp-login-form";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-500">
          Builders World Forum
        </p>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900">Admin sign in</h1>
        <div className="mt-6">
          <Suspense fallback={null}>
            <OtpLoginForm
              requestOtpUrl="/api/admin/auth/request-otp"
              providerId="admin-otp"
              defaultRedirectTo="/admin"
              forgotPasswordUrl="/admin/reset-password"
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
