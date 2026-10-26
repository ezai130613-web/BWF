import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { ADMIN_ROLE_KEYS } from "@/lib/auth/constants";
import { blanket } from "../access";
import type { ExportDataset } from "./types";

const chiefGuests: ExportDataset = {
  key: "chief-guests",
  title: "Chief Guests",
  scope: (a) => blanket(a, "chief_guests:manage"),
  async load() {
    const rows = await db.chiefGuest.findMany({
      include: { chapter: true },
      orderBy: [{ displayOrder: "asc" }, { visitedAt: "desc" }, { createdAt: "desc" }],
    });
    return [
      {
        name: "Chief Guests",
        columns: [
          { header: "Name", key: "name", width: 24 },
          { header: "Designation", key: "designation", width: 22 },
          { header: "Company", key: "company", width: 24 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Visited", key: "visited", type: "date", width: 14 },
          { header: "Published", key: "published" },
          { header: "Display Order", key: "order", type: "number" },
          { header: "Photo", key: "photo", type: "link" },
          { header: "Description", key: "description", width: 40 },
        ],
        rows: rows.map((g) => ({
          name: g.name,
          designation: g.designation,
          company: g.company,
          chapter: g.chapter?.name,
          visited: g.visitedAt,
          published: g.isPublished,
          order: g.displayOrder,
          photo: g.photoUrl,
          description: g.description,
        })),
      },
    ];
  },
};

const testimonials: ExportDataset = {
  key: "testimonials",
  title: "Testimonials",
  scope: (a) => blanket(a, "testimonials:manage"),
  async load() {
    const rows = await db.testimonial.findMany({
      include: { chapter: true, member: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return [
      {
        name: "Testimonials",
        columns: [
          { header: "Submitted", key: "created", type: "date", width: 14 },
          { header: "Name", key: "name", width: 22 },
          { header: "Company", key: "company", width: 22 },
          { header: "Role", key: "role", width: 18 },
          { header: "Type", key: "type", width: 14 },
          { header: "Status", key: "status", width: 12 },
          { header: "Featured", key: "featured" },
          { header: "Consent", key: "consent" },
          { header: "Rating", key: "rating", type: "number" },
          { header: "About Member", key: "member", width: 22 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Testimonial", key: "content", width: 60 },
          { header: "Image", key: "image", type: "link" },
          { header: "Video", key: "video", type: "link" },
        ],
        rows: rows.map((t) => ({
          created: t.createdAt,
          name: t.name,
          company: t.company,
          role: t.role,
          type: t.type,
          status: t.status,
          featured: t.featured,
          consent: t.consent,
          rating: t.rating,
          member: t.member?.name,
          chapter: t.chapter?.name,
          content: t.content,
          image: t.imageUrl,
          video: t.videoUrl,
        })),
      },
    ];
  },
};

const faqs: ExportDataset = {
  key: "faqs",
  title: "FAQs",
  scope: (a) => blanket(a, "content:manage"),
  async load() {
    const rows = await db.siteFaq.findMany({ orderBy: { order: "asc" } });
    return [
      {
        name: "FAQs",
        columns: [
          { header: "Order", key: "order", type: "number" },
          { header: "Question", key: "question", width: 50 },
          { header: "Answer", key: "answer", width: 80 },
          { header: "Shown", key: "active" },
        ],
        rows: rows.map((f) => ({ order: f.order, question: f.question, answer: f.answer, active: f.isActive })),
      },
    ];
  },
};

const blogs: ExportDataset = {
  key: "blogs",
  title: "Blog Posts",
  scope: (a) => blanket(a, "blogs:manage"),
  async load() {
    const rows = await db.blog.findMany({
      include: { category: true, author: true, submittedByMember: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return [
      {
        name: "Blog Posts",
        columns: [
          { header: "Title", key: "title", width: 40 },
          { header: "Status", key: "status", width: 12 },
          { header: "Category", key: "category", width: 20 },
          { header: "Author", key: "author", width: 20 },
          { header: "Submitted By Member", key: "member", width: 22 },
          { header: "Submission Status", key: "submission", width: 16 },
          { header: "Published", key: "published", type: "datetime", width: 20 },
          { header: "Scheduled", key: "scheduled", type: "datetime", width: 20 },
          { header: "Last Updated", key: "updated", type: "datetime", width: 20 },
          { header: "Link", key: "url", type: "link" },
          { header: "Excerpt", key: "excerpt", width: 50 },
        ],
        rows: rows.map((b) => ({
          title: b.title,
          status: b.status,
          category: b.category.name,
          author: b.author.name,
          member: b.submittedByMember?.name,
          submission: b.submissionStatus,
          published: b.publishedAt,
          scheduled: b.scheduledAt,
          updated: b.updatedAt,
          url: b.status === "PUBLISHED" ? `${SITE_URL}/insights/${b.slug}` : null,
          excerpt: b.excerpt,
        })),
      },
    ];
  },
};

const feedback: ExportDataset = {
  key: "feedback",
  title: "Feedback",
  scope: (a) => blanket(a, "feedback:view"),
  async load() {
    const rows = await db.feedback.findMany({
      include: { chapter: true, meeting: true, invitedByMember: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return [
      {
        name: "Feedback",
        columns: [
          { header: "Received", key: "created", type: "datetime", width: 20 },
          { header: "Type", key: "type", width: 12 },
          { header: "Name", key: "name", width: 22 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "Email", key: "email", width: 24 },
          { header: "Company", key: "company", width: 22 },
          { header: "Rating", key: "rating", type: "number" },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Meeting", key: "meeting", width: 24 },
          { header: "Invited By", key: "invitedBy", width: 22 },
          { header: "Message", key: "message", width: 60 },
        ],
        rows: rows.map((f) => ({
          created: f.createdAt,
          type: f.type,
          name: f.name,
          phone: f.phone,
          email: f.email,
          company: f.company,
          rating: f.rating,
          chapter: f.chapter?.name,
          meeting: f.meeting?.title,
          invitedBy: f.invitedByMember?.name,
          message: f.message,
        })),
      },
    ];
  },
};

/** Admin accounts as Excel (the existing PDF stays at /api/admin/exports/admin-users). Never passwords. */
const users: ExportDataset = {
  key: "users",
  title: "Admin Users",
  scope: (a) => blanket(a, "users:manage"),
  async load() {
    const rows = await db.user.findMany({
      where: { roles: { some: { role: { key: { in: ADMIN_ROLE_KEYS } } } } },
      include: { roles: { include: { role: true, chapter: true } } },
      orderBy: { createdAt: "asc" },
    });
    return [
      {
        name: "Admin Users",
        columns: [
          { header: "Name", key: "name", width: 24 },
          { header: "Username", key: "username", width: 16 },
          { header: "Email", key: "email", width: 28 },
          { header: "Roles", key: "roles", width: 30 },
          { header: "Status", key: "status" },
          { header: "Last Login", key: "lastLogin", type: "datetime", width: 20 },
          { header: "Created", key: "created", type: "date", width: 14 },
        ],
        rows: rows.map((u) => ({
          name: u.name,
          username: u.username,
          email: u.email,
          roles: u.roles.map((r) => (r.chapter ? `${r.role.label} (${r.chapter.name})` : r.role.label)).join(", "),
          status: u.status,
          lastLogin: u.lastLoginAt,
          created: u.createdAt,
        })),
      },
    ];
  },
};

/** /admin/activity — the audit log, newest first, capped so the file stays openable. */
const AUDIT_LIMIT = 10_000;
const activityLog: ExportDataset = {
  key: "activity-log",
  title: "Activity Log",
  scope: (a) => blanket(a, "audit_log:view"),
  async load() {
    const rows = await db.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: AUDIT_LIMIT,
    });
    return [
      {
        name: "Activity Log",
        columns: [
          { header: "When", key: "when", type: "datetime", width: 20 },
          { header: "By", key: "by", width: 24 },
          { header: "Action", key: "action", width: 30 },
          { header: "Record Type", key: "entity", width: 16 },
          { header: "Record ID", key: "entityId", width: 28 },
          { header: "Details", key: "details", width: 60 },
        ],
        rows: rows.map((l) => ({
          when: l.createdAt,
          by: l.user ? (l.user.name ?? l.user.email) : "System",
          action: l.action,
          entity: l.entity,
          entityId: l.entityId,
          details: l.metadata ? JSON.stringify(l.metadata) : null,
        })),
      },
    ];
  },
};

const marketing: ExportDataset = {
  key: "marketing",
  title: "Marketing",
  scope: (a) => blanket(a, "marketing:manage"),
  async load() {
    const [content, posts, plan, scripts] = await Promise.all([
      db.marketingContent.findMany({ include: { _count: { select: { scheduledPosts: true } } }, orderBy: { createdAt: "desc" } }),
      db.scheduledPost.findMany({ include: { content: { select: { title: true } } }, orderBy: { scheduledFor: "desc" } }),
      db.contentPlanEntry.findMany({ orderBy: { scheduledFor: "desc" } }),
      db.marketingScript.findMany({ orderBy: { scriptNumber: "asc" } }),
    ]);
    return [
      {
        name: "Content Library",
        columns: [
          { header: "Added", key: "created", type: "date", width: 14 },
          { header: "Title", key: "title", width: 34 },
          { header: "Video", key: "video", type: "link" },
          { header: "Thumbnail", key: "thumb", type: "link" },
          { header: "Scheduled Posts", key: "posts", type: "number" },
          { header: "Notes", key: "notes", width: 40 },
        ],
        rows: content.map((c) => ({
          created: c.createdAt,
          title: c.title,
          video: c.videoUrl,
          thumb: c.thumbnailUrl,
          posts: c._count.scheduledPosts,
          notes: c.notes,
        })),
      },
      {
        name: "Scheduled & Published Posts",
        columns: [
          { header: "Scheduled For", key: "scheduled", type: "datetime", width: 20 },
          { header: "Content", key: "content", width: 30 },
          { header: "Platform", key: "platform", width: 12 },
          { header: "Status", key: "status", width: 16 },
          { header: "Title", key: "title", width: 30 },
          { header: "Caption", key: "caption", width: 50 },
          { header: "Published Post", key: "url", type: "link" },
          { header: "Last Error", key: "error", width: 40 },
        ],
        rows: posts.map((p) => ({
          scheduled: p.scheduledFor,
          content: p.content.title,
          platform: p.platform,
          status: p.status.replace(/_/g, " "),
          title: p.title,
          caption: p.caption,
          url: p.publishedUrl,
          error: p.lastError,
        })),
      },
      {
        name: "Content Calendar",
        columns: [
          { header: "Planned For", key: "scheduled", type: "datetime", width: 20 },
          { header: "Title", key: "title", width: 30 },
          { header: "Topic", key: "topic", width: 24 },
          { header: "Format", key: "format", width: 14 },
          { header: "Platform", key: "platform", width: 12 },
          { header: "Status", key: "status", width: 14 },
          { header: "Assigned To", key: "assigned", width: 18 },
          { header: "Description", key: "description", width: 40 },
        ],
        rows: plan.map((e) => ({
          scheduled: e.scheduledFor,
          title: e.title,
          topic: e.topic,
          format: e.contentType,
          platform: e.platform,
          status: e.status,
          assigned: e.assignedTo,
          description: e.description,
        })),
      },
      {
        name: "Scripts",
        columns: [
          { header: "No.", key: "number", type: "number" },
          { header: "Title", key: "title", width: 30 },
          { header: "Topic", key: "topic", width: 24 },
          { header: "Format", key: "format", width: 14 },
          { header: "Status", key: "status", width: 12 },
          { header: "Updated", key: "updated", type: "date", width: 14 },
          { header: "Script", key: "content", width: 80 },
        ],
        rows: scripts.map((s) => ({
          number: s.scriptNumber,
          title: s.title,
          topic: s.topic,
          format: s.contentType,
          status: s.status,
          updated: s.updatedAt,
          content: s.content,
        })),
      },
    ];
  },
};

export const WEBSITE_DATASETS = [chiefGuests, testimonials, faqs, blogs, feedback, users, activityLog, marketing];
