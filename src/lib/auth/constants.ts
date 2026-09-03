/** Roles allowed through the admin login flow — kept in one place since
 * both the OTP-request route and the NextAuth authorize() callback need it. */
export const ADMIN_ROLE_KEYS: string[] = ["SUPER_ADMIN", "CENTRAL_ADMIN", "CHAPTER_ADMIN"];

/** Roles allowed through the member login flow (brief §12) — deliberately
 * disjoint from ADMIN_ROLE_KEYS, mirroring how Chapter Admin holds no
 * blanket permission: a Member login can never authenticate into /admin,
 * and vice versa, purely because neither role list contains the other's key. */
export const MEMBER_ROLE_KEYS: string[] = ["MEMBER"];
