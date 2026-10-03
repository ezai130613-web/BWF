import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getBooleanSetting } from "@/lib/settings";
import { getDefaultFeedbackRecipients } from "@/lib/feedback/notify";
import { isEmailProviderConfigured } from "@/lib/email";
import { SettingsPanel } from "@/components/admin/settings-panel";

export default async function SettingsPage() {
  await requirePermission("users:manage");

  const [notifySuperAdmins, requireEmailCode, defaults, extras] = await Promise.all([
    getBooleanSetting("feedback.notifySuperAdmins"),
    getBooleanSetting("memberActivation.requireEmailCode"),
    getDefaultFeedbackRecipients(),
    db.feedbackEmailRecipient.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">Super Admin only.</p>
        {!isEmailProviderConfigured() ? (
          <p className="mt-3 max-w-2xl rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            No email provider is configured in this environment — emails are written to the server log instead of
            being delivered.
          </p>
        ) : null}
      </div>
      <SettingsPanel
        notifySuperAdmins={notifySuperAdmins}
        requireEmailCode={requireEmailCode}
        defaults={defaults}
        extras={extras.map((e) => ({ id: e.id, email: e.email, isEnabled: e.isEnabled }))}
      />
    </div>
  );
}
