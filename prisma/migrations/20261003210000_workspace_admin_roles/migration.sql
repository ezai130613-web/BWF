-- 2026-10-03: three single-workspace admin roles + Central Admin opened to
-- the Accounts workspace (view only — approving stays with Super Admin and
-- Accounts). Inserts only; mirrors prisma/seed.ts.
INSERT INTO "roles" ("id", "key", "label", "description") VALUES
  ('role_website_admin', 'WEBSITE_ADMIN', 'Website Admin', 'Website Admin workspace only (added 2026-10-03).'),
  ('role_membership_admin', 'MEMBERSHIP_ADMIN', 'Membership Admin', 'Member Performance workspace only (added 2026-10-03).'),
  ('role_marketing_admin', 'MARKETING_ADMIN', 'Marketing Admin', 'Marketing workspace only (added 2026-10-03).')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM (VALUES
  ('WEBSITE_ADMIN', 'chapters:manage'), ('WEBSITE_ADMIN', 'categories:manage'), ('WEBSITE_ADMIN', 'companies:manage'),
  ('WEBSITE_ADMIN', 'members:manage'), ('WEBSITE_ADMIN', 'applications:manage'), ('WEBSITE_ADMIN', 'meetings:manage'),
  ('WEBSITE_ADMIN', 'visitors:manage'), ('WEBSITE_ADMIN', 'contact_requests:view'), ('WEBSITE_ADMIN', 'blogs:manage'),
  ('WEBSITE_ADMIN', 'testimonials:manage'), ('WEBSITE_ADMIN', 'chief_guests:manage'), ('WEBSITE_ADMIN', 'content:manage'),
  ('MEMBERSHIP_ADMIN', 'roster:manage'), ('MEMBERSHIP_ADMIN', 'attendance:manage'), ('MEMBERSHIP_ADMIN', 'invitations:manage'),
  ('MEMBERSHIP_ADMIN', 'points_config:manage'), ('MEMBERSHIP_ADMIN', 'app_activity:view'),
  ('MARKETING_ADMIN', 'marketing:manage'),
  ('CENTRAL_ADMIN', 'accounts:view'), ('CENTRAL_ADMIN', 'payments:view')
) AS grants(role_key, permission_key)
JOIN "roles" r ON r."key" = grants.role_key
JOIN "permissions" p ON p."key" = grants.permission_key
ON CONFLICT DO NOTHING;
