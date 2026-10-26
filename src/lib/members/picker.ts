import { db } from "@/lib/db";
import { fellowMemberScope } from "@/lib/members/visibility";

/** Minimal member shape for the portal's Chapter → Category → Member
 * picker — deliberately no contact details in the browser payload. */
export type PickerMember = {
  id: string;
  name: string;
  company: string;
  chapterId: string;
  chapterName: string;
  categoryId: string;
  categoryName: string;
};

/** Everyone the member can pick (see fellowMemberScope), excluding themselves. */
export async function getPickerMembers(viewerMemberId: string): Promise<PickerMember[]> {
  const members = await db.member.findMany({
    where: { AND: [{ status: "ACTIVE", id: { not: viewerMemberId } }, await fellowMemberScope(viewerMemberId)] },
    select: {
      id: true,
      name: true,
      company: { select: { name: true } },
      chapter: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });
  return members.map((m) => ({
    id: m.id,
    name: m.name,
    company: m.company.name,
    chapterId: m.chapter.id,
    chapterName: m.chapter.name,
    categoryId: m.category.id,
    categoryName: m.category.name,
  }));
}
