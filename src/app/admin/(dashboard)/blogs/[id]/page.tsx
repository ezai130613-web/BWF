import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/rbac";
import { db } from "@/lib/db";
import { EditBlogForm } from "@/components/admin/edit-blog-form";
import { deleteBlog } from "../actions";

export default async function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("blogs:manage");
  const { id } = await params;

  const post = await db.blog.findUnique({ where: { id }, include: { tags: true } });
  if (!post) notFound();

  const [categories, authors] = await Promise.all([
    db.blogCategory.findMany({ orderBy: { name: "asc" } }),
    db.author.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">{post.title || "Untitled post"}</h1>
          {post.status === "PUBLISHED" ? (
            <Link href={`/insights/${post.slug}`} target="_blank" className="mt-1 inline-block text-sm text-neutral-500 hover:text-neutral-900">
              View live /insights/{post.slug} →
            </Link>
          ) : null}
        </div>
        {post.status !== "ARCHIVED" ? (
          <form action={deleteBlog.bind(null, post.id)}>
            <button type="submit" className="text-sm text-red-600 hover:text-red-800">
              Archive
            </button>
          </form>
        ) : null}
      </div>

      <EditBlogForm post={post} categories={categories} authors={authors} tagNames={post.tags.map((t) => t.name)} />
    </div>
  );
}
