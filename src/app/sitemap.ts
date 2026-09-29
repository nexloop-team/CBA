import type { MetadataRoute } from "next";
import { getAllProjects, getProjectModified } from "@/lib/content";
import { SITE_URL } from "@content/site";

/** Regenerated whenever /admin saves, like the pages. */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/projects", "/studio", "/contact"].map((route) => ({
    url: `${SITE_URL}${route}/`.replace(/\/+$/, "/"),
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // Real modification times, so the value means something to a crawler instead
  // of just recording when the site last happened to deploy.
  const projects = await getAllProjects();
  const projectRoutes = await Promise.all(
    projects.map(async (project) => ({
      url: `${SITE_URL}/projects/${project.slug}/`,
      lastModified: await getProjectModified(project.slug),
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  );

  return [...staticRoutes, ...projectRoutes];
}
