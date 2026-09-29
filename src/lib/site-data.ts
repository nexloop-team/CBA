import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { BlobNotFoundError, head, put } from "@vercel/blob";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import type { Category, ProjectImage, ProjectStatus } from "@/types/project";
import type { ProjectRecord, SiteData } from "@/types/site-data";

/**
 * The editable content of the site - one JSON document in Vercel Blob.
 *
 * Pages read it through `getSiteData()`, which Next caches under the
 * "site-data" tag, so the site stays prerendered and fast. Saving from /admin
 * writes the document and invalidates that tag, and the next visit to any page
 * renders with the new content. No deploy is involved.
 *
 * Until the first save there is no document yet, and the content is read from
 * the repository instead (content/ plus the build-time image manifest).
 */

const DATA_PATH = "data/site.json";
export const SITE_DATA_TAG = "site-data";

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const MANIFEST_PATH = path.join(ROOT, ".generated", "images.json");

type Manifest = Record<string, (ProjectImage | null)[] | string[]>;

export function readManifest(): Manifest {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  } catch {
    return {};
  }
}

function readJson<T>(...segments: string[]): T {
  return JSON.parse(fs.readFileSync(path.join(CONTENT, ...segments), "utf8")) as T;
}

/** "TODO" and friends from the original placeholder files become empty. */
const blank = (value: unknown) => (typeof value === "string" && !/^TODO/i.test(value) ? value : "");

/** The site's content as the repository has it - used until /admin first saves. */
export function seedFromRepo(): SiteData {
  const manifest = readManifest();
  const brand = readJson<SiteData["brand"]>("brand.json");
  const site = readJson<Pick<SiteData, "description" | "contact" | "socials">>(
    "settings",
    "site.json",
  );
  const studio = readJson<
    Omit<SiteData["studio"], "founder"> & { founder: { name: string; title: string; bio: string } }
  >("settings", "studio.json");
  const testimonials = readJson<SiteData["testimonials"]>("settings", "testimonials.json");
  const reels = readJson<SiteData["reels"]>("settings", "reels.json");
  const now = new Date().toISOString();

  const projectsDir = path.join(CONTENT, "projects");
  const projects: ProjectRecord[] = fs
    .readdirSync(projectsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(projectsDir, d.name, "index.md")))
    .map((d) => {
      const { data, content } = matter(
        fs.readFileSync(path.join(projectsDir, d.name, "index.md"), "utf8"),
      );
      const images = ((manifest[d.name] ?? []) as ProjectImage[]).filter(Boolean);
      return {
        slug: d.name,
        title: String(data.title ?? d.name),
        category: (data.category ?? "architecture") as Category,
        status: (data.status ?? "completed") as ProjectStatus,
        featured: data.featured ?? true,
        order: Number(data.order ?? 99),
        location: blank(data.location),
        area: Number(data.area) || 0,
        year: Number(data.year) || 0,
        client: blank(data.client),
        summary: blank(data.summary),
        description: content.replace(/^TODO\(client\).*$/gm, "").trim(),
        tags: data.tags ?? [],
        scope: data.scope ?? [],
        ...(data.photographer ? { photographer: String(data.photographer) } : {}),
        ...(data.sourceUrl ? { sourceUrl: String(data.sourceUrl) } : {}),
        allImages: Boolean(data.allImages),
        images,
        updatedAt: now,
      };
    })
    .filter((p) => p.images.length > 0)
    .sort((a, b) => a.order - b.order);

  const portrait = ((manifest.studio ?? []) as ProjectImage[])[0] ?? null;

  return {
    schema: 1,
    updatedAt: now,
    brand,
    description: site.description,
    contact: site.contact,
    socials: site.socials,
    studio: { ...studio, founder: { ...studio.founder, portrait } },
    testimonials,
    reels,
    projects,
  };
}

/** The saved document, read fresh from Blob (no Next cache). Null before the first save. */
export async function readSavedSiteData(): Promise<SiteData | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const meta = await head(DATA_PATH);
    // The query string skips the Blob CDN's copy, which can lag an overwrite.
    const response = await fetch(`${meta.url}?v=${meta.uploadedAt.getTime()}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Blob read failed: ${response.status}`);
    const data = (await response.json()) as SiteData;
    return data.schema === 1 ? data : null;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }
}

/** What the admin edits: the saved document, or the repository's content before the first save. */
export async function readEditableSiteData(): Promise<SiteData> {
  return (await readSavedSiteData()) ?? seedFromRepo();
}

/**
 * What pages render. Cached until the next save; the commit sha is part of the
 * key so the repository fallback is re-read on every deploy.
 */
export const getSiteData = unstable_cache(
  readEditableSiteData,
  ["site-data", "schema-1", process.env.VERCEL_GIT_COMMIT_SHA ?? "local"],
  { tags: [SITE_DATA_TAG] },
);

/** Write the document and make every page pick it up on its next visit. */
export async function saveSiteData(data: SiteData): Promise<SiteData> {
  const saved: SiteData = { ...data, schema: 1, updatedAt: new Date().toISOString() };
  await put(DATA_PATH, JSON.stringify(saved), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  revalidateTag(SITE_DATA_TAG, { expire: 0 });
  revalidatePath("/", "layout");
  return saved;
}
