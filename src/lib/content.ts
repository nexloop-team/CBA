import "server-only";
import {
  CATEGORIES,
  type Category,
  type Project,
  type ProjectImage,
  type ProjectSummary,
} from "@/types/project";
import type { ProjectRecord, Reel } from "@/types/site-data";
import { buildSite } from "@content/site";
import { buildStudio } from "@content/studio";
import { getSiteData, readManifest } from "@/lib/site-data";

/**
 * Everything pages read, derived from the /admin data document
 * (src/lib/site-data.ts). All cached until the next save.
 */

/** House rule: a project shows at most this many images unless "show every image" is on. */
const MAX_IMAGES = 6;

/** A field that is deliberately not filled in yet. */
export function isPending(value: unknown): boolean {
  return value === 0 || value === "TODO" || value === "" || value === undefined || value === null;
}

function toProject(record: ProjectRecord): Project {
  const images = record.allImages ? record.images : record.images.slice(0, MAX_IMAGES);
  const pending = (["location", "area", "year", "summary", "client"] as const).filter((key) =>
    isPending(record[key]),
  );
  return {
    slug: record.slug,
    pending: [...pending],
    title: record.title,
    category: record.category,
    tags: record.tags ?? [],
    location: record.location,
    area: record.area,
    year: record.year,
    status: record.status,
    client: record.client || undefined,
    scope: record.scope ?? [],
    featured: record.featured,
    order: record.order,
    hero: images[0].src,
    summary: record.summary,
    sourceUrl: record.sourceUrl,
    photographer: record.photographer,
    body: record.description ?? "",
    heroImage: images[0],
    images,
  };
}

export async function getSite() {
  return buildSite(await getSiteData());
}

export async function getStudio() {
  return buildStudio(await getSiteData());
}

export async function getTestimonials() {
  const { testimonials } = await getSiteData();
  return testimonials.show ? testimonials.items : [];
}

/** All projects with at least one image, sorted by `order` then newest year first. */
export async function getAllProjects(): Promise<Project[]> {
  const data = await getSiteData();
  return data.projects
    .filter((p) => p.images.length > 0)
    .map(toProject)
    .sort((a, b) => a.order - b.order || (b.year || 0) - (a.year || 0));
}

/** Last edit time of a project, for the sitemap. */
export async function getProjectModified(slug: string): Promise<Date> {
  const record = (await getSiteData()).projects.find((p) => p.slug === slug);
  return record ? new Date(record.updatedAt) : new Date();
}

export async function getProjectSummaries(): Promise<ProjectSummary[]> {
  return (await getAllProjects()).map(({ body: _body, images: _images, ...rest }) => rest);
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await getAllProjects()).find((p) => p.slug === slug);
}

/** Images for the home-page service rows, in the order of site.services (build-time). */
export function getServiceImages(): (ProjectImage | undefined)[] {
  // Entries are null where a service has no image, so indexes stay aligned.
  const services = (readManifest().services ?? []) as (ProjectImage | null)[];
  return services.map((image) => image ?? undefined);
}

/**
 * Reels whose video file was part of the build. The list is recorded by
 * scripts/build-images.mjs, because files under public/ are not readable
 * from the server when a page re-renders after a save.
 */
export async function getPlayableReels(): Promise<Reel[]> {
  const { reels } = await getSiteData();
  if (!reels.show) return [];
  const files = new Set((readManifest().reelFiles ?? []) as string[]);
  return reels.items.filter((reel) => files.has(reel.name));
}

/** The founder portrait uploaded through /admin, if any. */
export async function getStudioPortrait(): Promise<ProjectImage | undefined> {
  return (await getSiteData()).studio.founder.portrait ?? undefined;
}

export async function getFeatured(): Promise<Project[]> {
  const all = await getAllProjects();
  const featured = all.filter((p) => p.featured);
  // Never let the home carousel be empty just because nobody set the flag.
  return featured.length > 0 ? featured : all.slice(0, 6);
}

/** Previous / next in display order, wrapping at both ends. */
export async function getAdjacent(slug: string): Promise<{ prev: Project; next: Project } | null> {
  const all = await getAllProjects();
  const i = all.findIndex((p) => p.slug === slug);
  if (i === -1 || all.length < 2) return null;
  return {
    prev: all[(i - 1 + all.length) % all.length],
    next: all[(i + 1) % all.length],
  };
}

/**
 * The image best suited to sitting behind pale type in a wide band - the
 * contact band at the foot of the home and studio pages.
 *
 * Two properties decide whether an image works there, both measured when the
 * image is processed:
 *
 *   - **dark**, so the scrim has something to work with rather than having to
 *     bury the photograph to make the type legible
 *   - **landscape**, because a wide band crops a portrait or a square to a
 *     narrow horizontal strip through the middle of the frame
 *
 * Main images are preferred, but a better-suited gallery image wins over a
 * poor main image.
 *
 * @param exclude image `stem`s already used elsewhere on the page.
 */
export async function getBandImage(
  exclude?: ReadonlySet<string>,
): Promise<ProjectImage | undefined> {
  const candidates = (await getAllProjects()).flatMap((project) =>
    project.images.map((image, i) => ({ image, isHero: i === 0 })),
  );
  if (candidates.length === 0) return undefined;

  const score = ({ image, isHero }: (typeof candidates)[number]) => {
    const ratio = image.width / image.height;
    return (
      // Darkness is the dominant term: 0-255, so it outweighs the rest.
      255 -
      image.brightness +
      // A wide frame survives the crop; anything squarer than 4:3 is penalised.
      (ratio >= 1.4 ? 60 : ratio >= 1.2 ? 20 : -40) +
      (isHero ? 25 : 0)
    );
  };

  const eligible = exclude ? candidates.filter((c) => !exclude.has(c.image.stem)) : candidates;
  // If the page has already spent every image, repeating one is better than
  // rendering the band with no photograph at all.
  const pool = eligible.length > 0 ? eligible : candidates;

  return pool.reduce((best, c) => (score(c) > score(best) ? c : best)).image;
}

/** Categories that actually have projects, in canonical order. */
export async function getUsedCategories(): Promise<Category[]> {
  const present = new Set((await getAllProjects()).map((p) => p.category));
  return CATEGORIES.filter((c) => present.has(c));
}
