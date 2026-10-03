-- 2026-10-03 client decision: payment records (Accounts workspace, Payments,
-- Visitors Payment, approve/reject, exports) are Accounts Department only.
-- The seed only ever adds role-permission rows, so the existing Super Admin
-- and Central Admin grants are revoked here. No data rows are touched.
DELETE FROM "role_permissions"
WHERE "roleId" IN (SELECT "id" FROM "roles" WHERE "key" IN ('SUPER_ADMIN', 'CENTRAL_ADMIN'))
  AND "permissionId" IN (SELECT "id" FROM "permissions" WHERE "key" IN ('accounts:view', 'payments:view', 'payments:approve'));
