/** Roles allowed through the admin login flow — kept in one place since
 * both the OTP-request route and the NextAuth authorize() callback need it. */
export const ADMIN_ROLE_KEYS: string[] = [
  "SUPER_ADMIN",
  "CENTRAL_ADMIN",
  "CHAPTER_ADMIN",
  "ACCOUNTS",
  "WEBSITE_ADMIN",
  "MEMBERSHIP_ADMIN",
  "MARKETING_ADMIN",
];

export type AdminWorkspace = "website" | "performance" | "marketing" | "accounts";

/** Where each admin workspace lands. */
export const WORKSPACE_HOME: Record<AdminWorkspace, string> = {
  website: "/admin",
  performance: "/admin/app-activity",
  marketing: "/admin/marketing",
  accounts: "/admin/accounts",
};

/** Roles confined to exactly one workspace (Phase 29 Accounts; 2026-10-03
 * Website/Membership/Marketing Admin). Such a login never sees the
 * workspace picker — they land straight in their workspace. */
const SINGLE_WORKSPACE_ROLES: Record<string, AdminWorkspace> = {
  ACCOUNTS: "accounts",
  WEBSITE_ADMIN: "website",
  MEMBERSHIP_ADMIN: "performance",
  MARKETING_ADMIN: "marketing",
};

/** The one workspace this login is confined to, or null for Super/Central/
 * Chapter Admin (who see everything their permissions allow). Pure role
 * check so proxy.ts can call it straight off the JWT. */
export function fixedWorkspaceFor(roles: string[]): AdminWorkspace | null {
  if (roles.some((role) => ["SUPER_ADMIN", "CENTRAL_ADMIN", "CHAPTER_ADMIN"].includes(role))) return null;
  const single = roles.map((role) => SINGLE_WORKSPACE_ROLES[role]).find(Boolean);
  return single ?? null;
}

export function isAccountsOnly(roles: string[]): boolean {
  return fixedWorkspaceFor(roles) === "accounts";
}

/** Roles allowed through the member login flow (brief §12) — deliberately
 * disjoint from ADMIN_ROLE_KEYS, mirroring how Chapter Admin holds no
 * blanket permission: a Member login can never authenticate into /admin,
 * and vice versa, purely because neither role list contains the other's key. */
export const MEMBER_ROLE_KEYS: string[] = ["MEMBER"];

/** OtpChallenge.purpose values (Phase 13) — the field has been a plain
 * string since Phase 2 ("room for PASSWORD_RESET etc. later"); named here
 * so call sites never spell the raw string out themselves. */
export const OTP_PURPOSE = {
  LOGIN: "LOGIN",
  PASSWORD_RESET: "PASSWORD_RESET",
  /** First-login email verification for bulk-credentialed members (2026-10-03). */
  EMAIL_VERIFY: "EMAIL_VERIFY",
} as const;
