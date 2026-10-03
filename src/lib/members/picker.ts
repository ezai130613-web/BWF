import { db } from "@/lib/db";

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

export async function getPickerMembers(excludeMemberId: string): Promise<PickerMember[]> {
  const members = await db.member.findMany({
    where: { status: "ACTIVE", id: { not: excludeMemberId }, chapter: { status: "ACTIVE" } },
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
