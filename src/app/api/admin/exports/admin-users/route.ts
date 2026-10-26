import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/rbac";
import { ADMIN_ROLE_KEYS } from "@/lib/auth/constants";
import { db } from "@/lib/db";
import { adminAccountsPdf } from "@/lib/auth/credentials-pdf";

/** 2026-10-21 — the /admin/users list as a PDF (Super Admin). Names, usernames, roles; never passwords. */
export async function GET() {
  await requirePermission("users:manage");

  const users = await db.user.findMany({
    where: { roles: { some: { role: { key: { in: ADMIN_ROLE_KEYS } } } } },
    include: { roles: { include: { role: true, chapter: true } } },
    orderBy: { createdAt: "asc" },
  });

  const pdf = await adminAccountsPdf(
    users.map((user) => {
      const primaryRole = user.roles.find((r) => ADMIN_ROLE_KEYS.includes(r.role.key)) ?? user.roles[0];
      return {
        name: user.name,
        username: user.username,
        email: user.email,
        role: primaryRole?.role.label ?? "—",
        chapter: primaryRole?.chapter?.name ?? null,
        status: user.status,
        lastLogin: user.lastLoginAt
          ? user.lastLoginAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
          : "Never",
      };
    }),
  );

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="bwf-admin-accounts-${new Date().toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
