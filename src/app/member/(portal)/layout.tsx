import { requireMemberProfile } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { PortalNav } from "@/components/member/portal-nav";

export default async function MemberPortalLayout({ children }: { children: React.ReactNode }) {
  const { member } = await requireMemberProfile();
  const [chapter, category] = await Promise.all([
    db.chapter.findUnique({ where: { id: member.chapterId }, select: { name: true } }),
    db.category.findUnique({ where: { id: member.categoryId }, select: { name: true } }),
  ]);

  return (
    <div className="min-h-screen bg-[#f5f7f4]">
      <PortalNav memberName={member.name} subtitle={[category?.name, chapter?.name].filter(Boolean).join(" · ")} />
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
