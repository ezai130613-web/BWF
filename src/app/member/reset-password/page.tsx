import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function MemberResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-neutral-500">
          Builders World Forum
        </p>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900">Reset password</h1>
        <div className="mt-6">
          <ResetPasswordForm
            requestUrl="/api/member/auth/request-password-reset"
            resetUrl="/api/member/auth/reset-password"
            loginUrl="/member/login"
          />
        </div>
      </div>
    </div>
  );
}
