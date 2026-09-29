import type { MetadataRoute } from "next";
import { getAllProjects, getProjectModified } from "@/lib/content";
import { site } from "@content/site";

/** Generated at build time and emitted into out/sitemap.xml. */
/** Route handlers must opt in explicitly under `output: "export"`. */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/projects", "/studio", "/contact"].map((route) => ({
    url: `${site.url}${route}/`.replace(/\/+$/, "/"),
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // Real modification times, so the value means something to a crawler instead
  // of just recording when the site last happened to deploy.
  const projectRoutes = getAllProjects().map((project) => ({
    url: `${site.url}/projects/${project.slug}/`,
    lastModified: getProjectModified(project.slug),
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...projectRoutes];
}
