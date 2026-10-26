import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { getRemarksForMembers } from "@/lib/remarks";
import { birthdayOf, formatBirthdayFull } from "@/lib/members/birthdays";
import { blanket, chapterScope, effectiveChapterId } from "../access";
import type { ExportDataset } from "./types";
import type { Prisma } from "@/generated/prisma/client";

const members: ExportDataset = {
  key: "members",
  title: "Members",
  scope: (a) => chapterScope(a, "members:manage"),
  async load(scope, params) {
    const chapterId = effectiveChapterId(scope, params.get("chapterId"));
    const categoryId = params.get("categoryId") || undefined;
    const where: Prisma.MemberWhereInput = {
      ...(chapterId ? { chapterId } : {}),
      ...(categoryId ? { categoryId } : {}),
    };
    const rows = await db.member.findMany({
      where,
      include: {
        company: true,
        chapter: true,
        category: true,
        referredBy: { select: { name: true } },
        user: { select: { username: true, email: true, lastLoginAt: true } },
      },
      orderBy: [{ chapter: { name: "asc" } }, { name: "asc" }],
    });
    const remarks = await getRemarksForMembers(rows.map((m) => m.id));

    return [
      {
        name: "Members",
        columns: [
          { header: "Name", key: "name", width: 26 },
          { header: "Status", key: "status", width: 11 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Category", key: "category", width: 24 },
          { header: "Company", key: "company", width: 26 },
          { header: "GST Number", key: "gst", width: 18 },
          { header: "Designation", key: "designation", width: 18 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "WhatsApp", key: "whatsapp", width: 15 },
          { header: "Email", key: "email", width: 26 },
          { header: "Birthday", key: "birthday", width: 18 },
          { header: "Website", key: "website", width: 26 },
          { header: "Address", key: "address", width: 34 },
          { header: "Business Location", key: "location", width: 26 },
          { header: "Years in Business", key: "years", type: "number" },
          { header: "Services", key: "services", width: 30 },
          { header: "Specialisations", key: "specialisations", width: 30 },
          { header: "USP", key: "usp", width: 30 },
          { header: "Areas Served", key: "areasServed", width: 24 },
          { header: "Certifications", key: "certifications", width: 24 },
          { header: "Major Projects", key: "majorProjects", width: 30 },
          { header: "Clientele", key: "clientele", width: 24 },
          { header: "Instagram", key: "instagram", type: "link" },
          { header: "LinkedIn", key: "linkedin", type: "link" },
          { header: "Facebook", key: "facebook", type: "link" },
          { header: "YouTube", key: "youtube", type: "link" },
          { header: "Photo", key: "photo", type: "link" },
          { header: "Brochure", key: "brochure", type: "link" },
          { header: "Video", key: "video", type: "link" },
          { header: "Public Profile", key: "profile", type: "link" },
          { header: "Referred By", key: "referredBy", width: 22 },
          { header: "Joined", key: "joined", type: "date" },
          { header: "On Printed Roster", key: "roster" },
          { header: "Login ID", key: "username", width: 14 },
          { header: "Login Email", key: "loginEmail", width: 26 },
          { header: "Last Login", key: "lastLogin", type: "datetime", width: 20 },
          { header: "Admin Remarks", key: "remarks", width: 40 },
        ],
        rows: rows.map((m) => ({
          name: m.name,
          status: m.status,
          chapter: m.chapter.name,
          category: m.category.name,
          company: m.company.name,
          gst: m.company.gstNumber,
          designation: m.designation,
          phone: m.phone,
          whatsapp: m.whatsapp,
          email: m.email,
          birthday: formatBirthdayFull(birthdayOf(m)),
          website: m.website,
          address: m.address,
          location: m.locationLabel,
          years: m.yearsInBusiness,
          services: m.services,
          specialisations: m.specialisations,
          usp: m.usp,
          areasServed: m.areasServed,
          certifications: m.certifications,
          majorProjects: m.majorProjects,
          clientele: m.clientele,
          instagram: m.instagramUrl,
          linkedin: m.linkedinUrl,
          facebook: m.facebookUrl,
          youtube: m.youtubeUrl,
          photo: m.photoUrl,
          brochure: m.brochureUrl,
          video: m.videoUrl,
          profile: m.status === "ACTIVE" && m.chapter.status !== "DRAFT" ? `${SITE_URL}/members/${m.slug}` : null,
          referredBy: m.referredBy?.name,
          joined: m.joinedAt,
          roster: m.rosterEligible,
          username: m.user?.username,
          loginEmail: m.user?.email,
          lastLogin: m.user?.lastLoginAt,
          remarks: (remarks.get(m.id) ?? []).map((r) => `${r.body} (${r.authorName})`).join("\n"),
        })),
      },
    ];
  },
};

const applications: ExportDataset = {
  key: "applications",
  title: "Membership Applications",
  scope: (a) => blanket(a, "applications:manage"),
  async load() {
    const rows = await db.membershipApplication.findMany({
      include: { category: true, chapter: true, convertedMember: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return [
      {
        name: "Applications",
        columns: [
          { header: "Submitted", key: "submitted", type: "datetime", width: 20 },
          { header: "Name", key: "name", width: 24 },
          { header: "Status", key: "status", width: 20 },
          { header: "Category", key: "category", width: 24 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Phone", key: "phone", width: 15 },
          { header: "WhatsApp", key: "whatsapp", width: 15 },
          { header: "Email", key: "email", width: 26 },
          { header: "Company", key: "company", width: 26 },
          { header: "GST Number", key: "gst", width: 18 },
          { header: "Designation", key: "designation", width: 18 },
          { header: "Years in Business", key: "years", type: "number" },
          { header: "Address", key: "address", width: 34 },
          { header: "Services", key: "services", width: 30 },
          { header: "Areas Served", key: "areasServed", width: 24 },
          { header: "Website", key: "website", width: 24 },
          { header: "How They Heard", key: "referralSource", width: 20 },
          { header: "Payment Screenshot", key: "paymentProof", type: "link", linkText: "Open proof" },
          { header: "Terms Accepted", key: "terms", type: "datetime", width: 20 },
          { header: "Converted To Member", key: "converted", width: 22 },
          { header: "Notes", key: "notes", width: 34 },
        ],
        rows: rows.map((a) => ({
          submitted: a.createdAt,
          name: a.name,
          status: a.status.replace(/_/g, " "),
          category: a.category.name,
          chapter: a.chapter?.name ?? "Waiting list",
          phone: a.phone,
          whatsapp: a.whatsapp,
          email: a.email,
          company: a.companyName,
          gst: a.gstNumber,
          designation: a.designation,
          years: a.yearsInBusiness,
          address: a.address,
          services: a.services,
          areasServed: a.areasServed,
          website: a.website,
          referralSource: a.referralSource,
          paymentProof: a.paymentScreenshotUrl,
          terms: a.termsAcceptedAt,
          converted: a.convertedMember?.name,
          notes: a.notes,
        })),
      },
    ];
  },
};

const chapters: ExportDataset = {
  key: "chapters",
  title: "Chapters",
  scope: (a) => blanket(a, "chapters:manage"),
  async load() {
    const rows = await db.chapter.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { members: { where: { status: "ACTIVE" } } } } },
    });
    return [
      {
        name: "Chapters",
        columns: [
          { header: "Name", key: "name", width: 20 },
          { header: "Status", key: "status" },
          { header: "Active Members", key: "members", type: "number" },
          { header: "Location", key: "location", width: 20 },
          { header: "Meeting Schedule", key: "schedule", width: 30 },
          { header: "Meeting Time", key: "time" },
          { header: "Venue", key: "venue", width: 26 },
          { header: "Address", key: "address", width: 34 },
          { header: "Google Maps", key: "maps", type: "link" },
        ],
        rows: rows.map((c) => ({
          name: c.name,
          status: c.status,
          members: c._count.members,
          location: c.location,
          schedule: c.meetingSchedule,
          time: c.meetingTime,
          venue: c.meetingVenue,
          address: c.meetingAddress,
          maps: c.googleMapsUrl,
        })),
      },
    ];
  },
};

const categories: ExportDataset = {
  key: "categories",
  title: "Categories",
  scope: (a) => blanket(a, "categories:manage"),
  async load() {
    const rows = await db.category.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { members: { where: { status: "ACTIVE" } } } } },
    });
    return [
      {
        name: "Categories",
        columns: [
          { header: "Name", key: "name", width: 30 },
          { header: "Active", key: "active" },
          { header: "Active Members", key: "members", type: "number" },
          { header: "Shown on Apply Form", key: "apply" },
          { header: "Shown as Open on Roster", key: "roster" },
          { header: "Description", key: "description", width: 40 },
        ],
        rows: rows.map((c) => ({
          name: c.name,
          active: c.isActive,
          members: c._count.members,
          apply: c.showOnApplyForm,
          roster: c.showInOpenCategories,
          description: c.description,
        })),
      },
    ];
  },
};

const companies: ExportDataset = {
  key: "companies",
  title: "Companies",
  scope: (a) => blanket(a, "companies:manage"),
  async load() {
    const rows = await db.company.findMany({
      orderBy: { name: "asc" },
      include: { members: { select: { name: true }, orderBy: { name: "asc" } } },
    });
    return [
      {
        name: "Companies",
        columns: [
          { header: "Name", key: "name", width: 30 },
          { header: "GST Number", key: "gst", width: 18 },
          { header: "Website", key: "website", width: 26 },
          { header: "Members", key: "members", width: 40 },
          { header: "Description", key: "description", width: 40 },
        ],
        rows: rows.map((c) => ({
          name: c.name,
          gst: c.gstNumber,
          website: c.website,
          members: c.members.map((m) => m.name).join(", "),
          description: c.description,
        })),
      },
    ];
  },
};

/** Login status only — never a password, temporary or otherwise. */
const memberLogins: ExportDataset = {
  key: "member-logins",
  title: "Member Logins",
  scope: (a) => blanket(a, "users:manage"),
  async load() {
    const rows = await db.member.findMany({
      where: { status: "ACTIVE" },
      include: { chapter: true, category: true, user: true },
      orderBy: [{ chapter: { name: "asc" } }, { name: "asc" }],
    });
    return [
      {
        name: "Member Logins",
        columns: [
          { header: "Member", key: "name", width: 26 },
          { header: "Chapter", key: "chapter", width: 16 },
          { header: "Category", key: "category", width: 24 },
          { header: "Login Status", key: "state", width: 22 },
          { header: "Login ID", key: "username", width: 14 },
          { header: "Login Email", key: "email", width: 26 },
          { header: "Credentials Issued", key: "issued", type: "datetime", width: 20 },
          { header: "Last Login", key: "lastLogin", type: "datetime", width: 20 },
        ],
        rows: rows.map((m) => ({
          name: m.name,
          chapter: m.chapter.name,
          category: m.category.name,
          state: !m.user ? "No login" : m.user.mustChangePassword ? "Issued, not activated" : "Activated",
          username: m.user?.username,
          email: m.user?.email,
          issued: m.user?.temporaryPasswordIssuedAt,
          lastLogin: m.user?.lastLoginAt,
        })),
      },
    ];
  },
};

export const MEMBERSHIP_DATASETS = [members, applications, chapters, categories, companies, memberLogins];
