/** Roles allowed through the admin login flow — kept in one place since
 * both the OTP-request route and the NextAuth authorize() callback need it. */
export const ADMIN_ROLE_KEYS: string[] = ["SUPER_ADMIN", "CENTRAL_ADMIN", "CHAPTER_ADMIN"];
