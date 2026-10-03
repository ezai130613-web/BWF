import { db } from "@/lib/db";

/**
 * Admin-editable switches stored in `AppSetting` (2026-10-03). Every key and
 * its default lives here so call sites never spell a raw key string — a
 * missing row simply means "still on the default".
 */
const SETTING_DEFAULTS = {
  /** First member login: email a 6-digit code to verify the address before
   * the temporary password is replaced. Off = the member just types an email. */
  "memberActivation.requireEmailCode": true,
  /** Visitor feedback emails go to every active Super Admin by default. */
  "feedback.notifySuperAdmins": true,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getBooleanSetting(key: SettingKey): Promise<boolean> {
  const row = await db.appSetting.findUnique({ where: { key } });
  return typeof row?.value === "boolean" ? row.value : SETTING_DEFAULTS[key];
}

export async function setBooleanSetting(key: SettingKey, value: boolean) {
  await db.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}
