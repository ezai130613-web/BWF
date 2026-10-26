import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { getBooleanSetting } from "@/lib/settings";
import { getDefaultFeedbackRecipients } from "@/lib/feedback/notify";
import { isEmailProviderConfigured } from "@/lib/email";
import { SettingsPanel } from "@/components/admin/settings-panel";
import { AdminPageIcon } from "@/components/admin/page-icon";
import { AttendanceAutomationSettings } from "@/components/admin/attendance-automation-settings";
import { getAbsenceTrackingFrom } from "@/lib/attendance/absences";
import { WHATSAPP_TEMPLATES, whatsAppMode } from "@/lib/whatsapp";
import { formatIstDateTime } from "@/lib/ist";

export default async function SettingsPage() {
  await requirePermission("users:manage");

  const [notifySuperAdmins, requireEmailCode, defaults, extras, trackingFrom] = await Promise.all([
    getBooleanSetting("feedback.notifySuperAdmins"),
    getBooleanSetting("memberActivation.requireEmailCode"),
    getDefaultFeedbackRecipients(),
    db.feedbackEmailRecipient.findMany({ orderBy: { createdAt: "asc" } }),
    getAbsenceTrackingFrom(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          <AdminPageIcon />Settings</h1>
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
      <AttendanceAutomationSettings
        trackingFrom={trackingFrom ? formatIstDateTime(trackingFrom) : null}
        whatsApp={whatsAppMode()}
        templates={Object.values(WHATSAPP_TEMPLATES).map((t) => ({ name: t.name, body: t.body }))}
      />
    </div>
  );
}
