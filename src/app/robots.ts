import type { MetadataRoute } from "next";
import { site } from "@content/site";

/** Route handlers must opt in explicitly under `output: "export"`. */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin/" },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
