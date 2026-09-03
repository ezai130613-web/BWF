import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Phase 14 fix: bare "/member" is a *prefix* match in robots.txt, so it
      // was also matching (and blocking) the entirely public "/members"
      // directory — caught by a real Lighthouse SEO audit ("Page is blocked
      // from indexing"), not by reading the file. "/member$" (Google's
      // documented pattern-matching extension) anchors to the exact path so
      // it only blocks the member portal's own root, not "/members/*".
      disallow: ["/admin", "/admin/", "/member$", "/member/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
