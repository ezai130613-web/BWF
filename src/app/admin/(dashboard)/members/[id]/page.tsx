import { notFound } from "next/navigation";
import Link from "next/link";
import { requireChapterAccess } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { EditMemberForm } from "@/components/admin/edit-member-form";

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const member = await db.member.findUnique({
    where: { id },
    include: { company: true, chapter: true, category: true },
  });
  if (!member) notFound();

  await requireChapterAccess(member.chapterId, "members:manage");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{member.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          {member.chapter.name} · {member.category.name} · {member.company.name}
        </p>
        <Link href={`/members/${member.slug}`} target="_blank" className="mt-1 inline-block text-sm text-neutral-500 hover:text-neutral-900">
          View public profile /members/{member.slug} →
        </Link>
      </div>

      <EditMemberForm member={member} />
    </div>
  );
}
