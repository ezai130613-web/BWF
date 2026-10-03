-- 2026-10-03 client correction: Super Admin keeps payment/accounts access
-- (reverses the Super Admin part of 20261003180000_accounts_only_payments;
-- Central Admin's payments:view stays revoked). Re-grants only.
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "roles" r CROSS JOIN "permissions" p
WHERE r."key" = 'SUPER_ADMIN' AND p."key" IN ('accounts:view', 'payments:view', 'payments:approve')
ON CONFLICT DO NOTHING;
