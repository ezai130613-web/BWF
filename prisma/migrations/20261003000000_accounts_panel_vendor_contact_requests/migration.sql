-- CreateTable
CREATE TABLE "vendor_contact_requests" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterPhone" TEXT NOT NULL,
    "requesterEmail" TEXT,
    "requirement" TEXT,
    "reusedFromDevice" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_contact_requests_memberId_idx" ON "vendor_contact_requests"("memberId");

-- CreateIndex
CREATE INDEX "vendor_contact_requests_createdAt_idx" ON "vendor_contact_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "vendor_contact_requests" ADD CONSTRAINT "vendor_contact_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Phase 29 (client decision, 2026-10-03): payment approval is Super Admin +
-- Accounts Department only — revoke Central Admin's earlier default grant.
-- Central Admin keeps payments:view. The ACCOUNTS role and its grants are
-- created by prisma/seed.ts (idempotent upserts), like every other role.
DELETE FROM "role_permissions"
WHERE "roleId" IN (SELECT "id" FROM "roles" WHERE "key" = 'CENTRAL_ADMIN')
  AND "permissionId" IN (SELECT "id" FROM "permissions" WHERE "key" = 'payments:approve');
