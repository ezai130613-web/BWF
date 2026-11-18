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
  /** 2026-11-03 — members can check in only when this meeting's fee and the
   * year's membership are paid (approved). Off until Accounts has entered the
   * payments members already made; Super Admin / Accounts switch it on from
   * the Accounts page. */
  "attendance.requirePayment": false,
  /** 2026-11-03 — email the invoice to the member automatically as soon as a
   * Razorpay payment is confirmed. Off: admins send invoices themselves with
   * the "Send invoice" button. Cash/bank/UPI/screenshot payments are always manual. */
  "invoices.autoSendRazorpay": false,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getBooleanSetting(key: SettingKey): Promise<boolean> {
  const row = await db.appSetting.findUnique({ where: { key } });
  return typeof row?.value === "boolean" ? row.value : SETTING_DEFAULTS[key];
}

export async function setBooleanSetting(key: SettingKey, value: boolean) {
  await db.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

/**
 * Number settings (2026-11-18). `membership.dueDaysBefore`: the annual
 * membership fee falls due this many days BEFORE a member's year starts
 * (their joining anniversary). 0 = due on the anniversary itself.
 */
const NUMBER_DEFAULTS = {
  "membership.dueDaysBefore": 30,
} as const;

export type NumberSettingKey = keyof typeof NUMBER_DEFAULTS;

export async function getNumberSetting(key: NumberSettingKey): Promise<number> {
  const row = await db.appSetting.findUnique({ where: { key } });
  return typeof row?.value === "number" && Number.isFinite(row.value) ? row.value : NUMBER_DEFAULTS[key];
}

export async function setNumberSetting(key: NumberSettingKey, value: number) {
  await db.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}
