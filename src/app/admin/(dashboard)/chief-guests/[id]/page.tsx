import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/rbac";
import { EditChiefGuestForm } from "@/components/admin/edit-chief-guest-form";
import { DeleteChiefGuestButton } from "@/components/admin/delete-chief-guest-button";

export default async function ChiefGuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("chief_guests:manage");
  const { id } = await params;

  const [guest, chapters] = await Promise.all([
    db.chiefGuest.findUnique({ where: { id } }),
    db.chapter.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!guest) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{guest.name}</h1>
          <p className="mt-1 text-sm text-neutral-600">{guest.company}</p>
        </div>
        <DeleteChiefGuestButton guestId={guest.id} />
      </div>

      <EditChiefGuestForm guest={guest} chapters={chapters} />
    </div>
  );
}
