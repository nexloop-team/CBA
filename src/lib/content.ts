import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  CATEGORIES,
  type Category,
  type Project,
  type ProjectImage,
  type ProjectSummary,
} from "@/types/project";

const ROOT = process.cwd();
const PROJECTS_DIR = path.join(ROOT, "content", "projects");
const MANIFEST_PATH = path.join(ROOT, ".generated", "images.json");

type ManifestEntry = ProjectImage & { fallbackWidth: number };
type Manifest = Record<string, ManifestEntry[]>;

function loadManifest(): Manifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(
      "Image manifest missing. Run `npm run images` before `next build` " +
        "(the `build` script already does this; `dev` needs it run once).",
    );
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
}

/** A field that is deliberately not filled in yet. */
export function isPending(value: unknown): boolean {
  return value === 0 || value === "TODO" || value === "" || value === undefined || value === null;
}

/**
 * Two classes of problem, treated differently.
 *
 * Structural errors - no images, a hero that is not on disk, an unknown
 * category - fail the build. They mean the page cannot render correctly and
 * are always a mistake.
 *
 * Placeholders - `area: 0`, `location: "TODO"` - do not. Projects are
 * published with real photography before every detail is known, so these are
 * collected, omitted from the rendered page, and reported at the end of the
 * build. Rendering "0 m²" would be worse than rendering nothing.
 */
function validate(slug: string, data: Record<string, unknown>, images: ManifestEntry[]) {
  const problems: string[] = [];
  const pending: string[] = [];

  // Structural: the page cannot render without these.
  for (const key of ["title", "category", "status", "hero"] as const) {
    if (data[key] === undefined || data[key] === null || data[key] === "") {
      problems.push(`missing "${key}"`);
    }
  }

  // Editorial: fine to be absent for now, just not to be displayed.
  for (const key of ["location", "area", "year", "summary", "client"] as const) {
    if (isPending(data[key])) pending.push(key);
  }

  if (data.category && !CATEGORIES.includes(data.category as Category)) {
    problems.push(`category "${String(data.category)}" is not one of ${CATEGORIES.join(", ")}`);
  }
  if (data.status && !["completed", "ongoing"].includes(String(data.status))) {
    problems.push(`status "${String(data.status)}" must be "completed" or "ongoing"`);
  }
  if (typeof data.area === "number" && data.area < 0) {
    problems.push(`area cannot be negative`);
  }
  if (typeof data.year !== "number") {
    problems.push(`year must be a number (0 while unknown)`);
  }
  if (typeof data.year === "number" && data.year > 0 && data.year < 1900) {
    problems.push(`year ${data.year} looks wrong`);
  }
  if (typeof data.year === "number" && data.year > new Date().getFullYear() + 5) {
    problems.push(`year ${data.year} looks wrong`);
  }
  if (images.length === 0) {
    problems.push("no images found - add files to images/ and run `npm run images`");
  }
  if (data.hero && images.length > 0 && !images.some((i) => i.src === data.hero)) {
    problems.push(
      `hero "${String(data.hero)}" is not in images/ (found: ${images.map((i) => i.src).join(", ")})`,
    );
  }

  if (problems.length > 0) {
    throw new Error(
      `Invalid project "content/projects/${slug}/index.md":\n  - ${problems.join("\n  - ")}`,
    );
  }

  return pending;
}

function readProject(slug: string, manifest: Manifest): Project {
  const file = path.join(PROJECTS_DIR, slug, "index.md");
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  // The admin stores image fields as "images/x.jpg"; the manifest keys by filename.
  if (typeof data.hero === "string") data.hero = path.basename(data.hero);
  const images = manifest[slug] ?? [];

  const pending = validate(slug, data, images);

  // Neutralise placeholder values at the boundary. Components already decide
  // what to show from `pending`, so carrying the literal string "TODO" any
  // further only risks it reaching the RSC payload - and from there a crawler.
  const clean = <T>(key: string, value: T, empty: T): T => (pending.includes(key) ? empty : value);

  const heroImage = images.find((i) => i.src === data.hero)!;
  // Hero first, then the rest in filename order.
  const ordered = [heroImage, ...images.filter((i) => i.src !== heroImage.src)];

  return {
    slug,
    pending,
    title: data.title,
    category: data.category as Category,
    tags: data.tags ?? [],
    location: clean("location", data.location, ""),
    area: clean("area", data.area, 0),
    year: clean("year", data.year, 0),
    status: data.status,
    client: clean("client", data.client, undefined),
    scope: data.scope ?? [],
    featured: data.featured ?? false,
    order: data.order ?? 999,
    hero: data.hero,
    summary: clean("summary", data.summary, ""),
    sourceUrl: data.sourceUrl,
    photographer: data.photographer,
    body: content.trim(),
    heroImage,
    images: ordered,
  };
}

let cache: Project[] | null = null;
/**
 * The manifest's mtime at the time the cache was filled.
 *
 * Without this, a dev server that is already running keeps serving the manifest
 * it read at startup. Re-running `npm run images` then produces a mismatch -
 * every <img> points at a derivative width that no longer exists on disk, and
 * the whole site renders as broken images until the server is restarted.
 */
let cacheStamp = 0;

function manifestStamp(): number {
  try {
    return fs.statSync(MANIFEST_PATH).mtimeMs;
  } catch {
    return 0;
  }
}

/** All projects, sorted by `order` then newest year first. */
export function getAllProjects(): Project[] {
  const stamp = manifestStamp();
  if (cache && stamp === cacheStamp) return cache;

  if (!fs.existsSync(PROJECTS_DIR)) {
    cacheStamp = stamp;
    return (cache = []);
  }
  const manifest = loadManifest();
  cacheStamp = stamp;

  const slugs = fs
    .readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."))
    .filter((d) => fs.existsSync(path.join(PROJECTS_DIR, d.name, "index.md")))
    .map((d) => d.name);

  cache = slugs
    .map((slug) => readProject(slug, manifest))
    .sort((a, b) => a.order - b.order || (b.year || 0) - (a.year || 0));

  // Surface outstanding placeholders once, so they cannot quietly ship.
  const outstanding = cache.filter((p) => p.pending.length > 0);
  if (outstanding.length > 0) {
    console.warn(
      `\ncontent: ${outstanding.length} project(s) still have placeholder fields ` +
        `(omitted from the page rather than rendered):`,
    );
    for (const p of outstanding) {
      console.warn("  " + p.slug + " -> " + p.pending.join(", "));
    }
    console.warn("");
  }

  return cache;
}

/** Last edit time of a project's index.md, for the sitemap. */
export function getProjectModified(slug: string): Date {
  try {
    return fs.statSync(path.join(PROJECTS_DIR, slug, "index.md")).mtime;
  } catch {
    return new Date();
  }
}

export function getProjectSummaries(): ProjectSummary[] {
  return getAllProjects().map(({ body: _body, images: _images, ...rest }) => rest);
}

export function getProject(slug: string): Project | undefined {
  return getAllProjects().find((p) => p.slug === slug);
}

/** Images for the home-page service rows, in the order of site.services. */
export function getServiceImages(): (ProjectImage | undefined)[] {
  // Entries are null where a service has no image, so indexes stay aligned.
  const services = (loadManifest().services ?? []) as (ManifestEntry | null)[];
  return services.map((image) => image ?? undefined);
}

/** The founder portrait uploaded through /admin, if any. */
export function getStudioPortrait(): ProjectImage | undefined {
  return loadManifest().studio?.[0];
}

export function getFeatured(): Project[] {
  const featured = getAllProjects().filter((p) => p.featured);
  // Never let the home carousel be empty just because nobody set the flag.
  return featured.length > 0 ? featured : getAllProjects().slice(0, 6);
}

/** Previous / next in display order, wrapping at both ends. */
export function getAdjacent(slug: string): { prev: Project; next: Project } | null {
  const all = getAllProjects();
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
 * This used to be `projects[projects.length - 1].heroImage`, which is a
 * position, not a judgement. It landed on the one square 6000x6000 photograph
 * on the site, at mean luminance 197 - the brightest image we have, cropped to
 * a meaningless mid-slice, under white text. Two properties actually decide
 * whether an image works here, and both are already measured at build time:
 *
 *   - **dark**, so the scrim has something to work with rather than having to
 *     bury the photograph to make the type legible
 *   - **landscape**, because a wide band crops a portrait or a square to a
 *     narrow horizontal strip through the middle of the frame
 *
 * Hero images are preferred, since those are the shots chosen to represent
 * their project, but a better-suited gallery image wins over a poor hero.
 *
 * @param exclude image `stem`s already used elsewhere on the page.
 */
export function getBandImage(exclude?: ReadonlySet<string>): ProjectImage | undefined {
  const candidates = getAllProjects().flatMap((project) =>
    project.images.map((image, i) => ({ image, isHero: i === 0 })),
  );
  if (candidates.length === 0) return undefined;

  const score = ({ image, isHero }: (typeof candidates)[number]) => {
    const ratio = image.width / image.height;
    return (
      // Darkness is the dominant term: 0-255, so it outweighs the rest.
      255 -
      image.brightness +
      // A wide frame survives the crop; anything squarer than 4:3 is penalised
      // in proportion to how square it is.
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
export function getUsedCategories(): Category[] {
  const present = new Set(getAllProjects().map((p) => p.category));
  return CATEGORIES.filter((c) => present.has(c));
}
