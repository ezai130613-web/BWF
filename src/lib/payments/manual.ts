/** Payment methods Accounts enters by hand — the only payments that can be deleted (others are rejected, not deleted). */
export const MANUAL_METHODS = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE"] as const;
export const isManualMethod = (m: string) => (MANUAL_METHODS as readonly string[]).includes(m);
