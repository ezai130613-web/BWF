-- CreateTable
CREATE TABLE "roster_roles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "roster_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_assignments" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roster_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roster_roles_key_key" ON "roster_roles"("key");

-- CreateIndex
CREATE INDEX "roster_assignments_chapterId_idx" ON "roster_assignments"("chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "roster_assignments_chapterId_roleId_memberId_key" ON "roster_assignments"("chapterId", "roleId", "memberId");

-- AddForeignKey
ALTER TABLE "roster_assignments" ADD CONSTRAINT "roster_assignments_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignments" ADD CONSTRAINT "roster_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roster_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_assignments" ADD CONSTRAINT "roster_assignments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

