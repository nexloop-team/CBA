#!/usr/bin/env node
/**
 * Build-time image pipeline.
 *
 * `output: 'export'` disables the Next image optimizer, so derivatives are
 * generated here instead: responsive AVIF + WebP at several widths, a JPEG
 * fallback, and a base64 LQIP for blur-up. Results land in public/media/ and
 * are described by .generated/images.json, which src/lib/content.ts reads.
 *
 * Source precedence: images/_originals/<name> beats images/<name>, so
 * full-resolution photography can be dropped in later to replace lower-quality
 * Instagram exports without touching any content file.
 *
 * Incremental: an image is reprocessed only when its source is newer than its
 * manifest entry. Pass --force to rebuild everything.
 */
import { readFile, readdir, mkdir, writeFile, rm, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import matter from "gray-matter";
import { buildOgCards, buildIcons, readBrand } from "./build-brand-assets.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECTS_DIR = path.join(ROOT, "content", "projects");
const OUT_DIR = path.join(ROOT, "public", "media");

/**
 * Derivatives survive between deploys in the host's build cache. Vercel
 * restores .next/cache before every build, so after the first deploy only new
 * or changed photos are encoded instead of all of them.
 */
const BUILD_CACHE = path.join(ROOT, ".next", "cache", "cba-images");
const SAVE_BUILD_CACHE = Boolean(process.env.VERCEL || process.env.CI);

/**
 * Anything that changes the output. Part of each image's cache key, so editing
 * a width or quality setting re-encodes everything on the next build.
 */
const PIPELINE = "widths=480,768,1200,1600,2000,2560,3200;avif=70/2;webp=86;jpg=82;v1";

/**
 * Cache key from the file's bytes, not its modified time: a fresh git clone
 * (every deploy) gives every file a new mtime, which made each build re-encode
 * every image from scratch.
 */
async function sourceHash(file) {
  return createHash("sha1")
    .update(PIPELINE)
    .update(await readFile(file))
    .digest("hex");
}
/** House rule: a project shows at most this many images. Extras stay on disk, unused. */
const MAX_IMAGES = 6;
const MANIFEST = path.join(ROOT, ".generated", "images.json");

const WIDTHS = [480, 768, 1200, 1600, 2000, 2560, 3200];
const EXT_RE = /\.(jpe?g|png|webp|avif|tiff?)$/i;
const FORCE = process.argv.includes("--force");

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

async function listDir(dir) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** Union of images/ and images/_originals/, with _originals taking precedence. */
async function collectSources(imagesDir) {
  const sources = new Map();
  for (const entry of await listDir(imagesDir)) {
    if (entry.isFile() && EXT_RE.test(entry.name)) {
      sources.set(entry.name, path.join(imagesDir, entry.name));
    }
  }
  const originalsDir = path.join(imagesDir, "_originals");
  for (const entry of await listDir(originalsDir)) {
    if (entry.isFile() && EXT_RE.test(entry.name)) {
      // Match on basename so a .png original can replace a .jpg export.
      const stem = entry.name.replace(EXT_RE, "");
      const existing = [...sources.keys()].find((k) => k.replace(EXT_RE, "") === stem);
      sources.delete(existing ?? entry.name);
      sources.set(existing ?? entry.name, path.join(originalsDir, entry.name));
    }
  }
  return [...sources.entries()].sort(([a], [b]) => a.localeCompare(b, "en"));
}

/**
 * The admin stores `hero` and `gallery` as "images/x.jpg". When a gallery is
 * set, the page shows the hero then exactly those images in that order;
 * anything else in the folder (e.g. removed in the admin) is ignored.
 * Without one, every file in the folder is used, in filename order.
 */
function orderSources(sources, data) {
  const byName = new Map(sources);
  const hero = data.hero ? path.basename(String(data.hero)) : null;
  if (!Array.isArray(data.gallery)) return sources;
  const names = [hero, ...data.gallery.map((g) => path.basename(String(g)))].filter(Boolean);
  return [...new Set(names)].filter((n) => byName.has(n)).map((n) => [n, byName.get(n)]);
}

async function processImage({ slug, name, srcPath, title, altOverride, index }) {
  const stemName = name.replace(EXT_RE, "");
  const destDir = path.join(OUT_DIR, slug);
  await mkdir(destDir, { recursive: true });

  const image = sharp(srcPath, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`Unreadable image: ${rel(srcPath)}`);
  }

  // Never upscale - always include at least one width.
  const widths = WIDTHS.filter((w) => w <= meta.width);
  if (widths.length === 0) widths.push(meta.width);

  for (const w of widths) {
    const resized = () => sharp(srcPath, { failOn: "none" }).rotate().resize({ width: w });
    await Promise.all([
      resized()
        .avif({ quality: 70, effort: 2 })
        .toFile(path.join(destDir, `${stemName}-${w}.avif`)),
      resized()
        .webp({ quality: 86 })
        .toFile(path.join(destDir, `${stemName}-${w}.webp`)),
    ]);
  }

  // JPEG fallback. Deliberately capped well below the largest width: this is
  // only served to browsers that support neither AVIF nor WebP, which in
  // practice means almost nobody. Generating it at 2560 tripled the size of the
  // deployed media folder for a path essentially no visitor takes.
  const FALLBACK_CAP = 1200;
  const fallbackWidth = widths.filter((w) => w <= FALLBACK_CAP).pop() ?? widths[0];
  await sharp(srcPath, { failOn: "none" })
    .rotate()
    .resize({ width: fallbackWidth })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(destDir, `${stemName}-${fallbackWidth}.jpg`));

  // Mean luminance, so overlays can adapt. A night exterior and a bright
  // interior need very different scrims to keep text legible without turning
  // the photograph to mud.
  const grey = await sharp(srcPath, { failOn: "none" }).greyscale().stats();
  const brightness = Math.round(grey.channels[0].mean);

  const lqip = await sharp(srcPath, { failOn: "none" })
    .rotate()
    .resize({ width: 20 })
    .blur(1)
    .webp({ quality: 30 })
    .toBuffer();

  return {
    src: name,
    width: meta.width,
    height: meta.height,
    widths,
    stem: `/media/${slug}/${stemName}`,
    blurDataURL: `data:image/webp;base64,${lqip.toString("base64")}`,
    brightness,
    alt: altOverride ?? `${title} - image ${index + 1}`,
    fallbackWidth,
  };
}

async function main() {
  if (!existsSync(PROJECTS_DIR)) {
    console.error(`No content/projects/ directory found at ${rel(PROJECTS_DIR)}`);
    process.exit(1);
  }

  // A forced rebuild must clear old derivatives first. Widths and formats
  // change over time, and regenerating without clearing leaves orphans behind
  // that nothing references but that still ship in the deploy.
  if (FORCE && existsSync(OUT_DIR)) {
    await rm(OUT_DIR, { recursive: true, force: true });
    console.log("cleared public/media for a forced rebuild");
  }

  if (!FORCE && !existsSync(MANIFEST) && existsSync(path.join(BUILD_CACHE, "images.json"))) {
    await cp(path.join(BUILD_CACHE, "media"), OUT_DIR, { recursive: true });
    await mkdir(path.dirname(MANIFEST), { recursive: true });
    await cp(path.join(BUILD_CACHE, "images.json"), MANIFEST);
    console.log("images: restored previous derivatives from the build cache");
  }

  let previous = {};
  if (!FORCE && existsSync(MANIFEST)) {
    try {
      previous = JSON.parse(await readFile(MANIFEST, "utf8"));
    } catch {
      previous = {};
    }
  }

  const manifest = {};
  const projects = [];
  let processed = 0;
  let reused = 0;
  const warnings = [];

  const slugs = (await listDir(PROJECTS_DIR)).filter((d) => d.isDirectory()).map((d) => d.name);

  for (const slug of slugs) {
    const projectDir = path.join(PROJECTS_DIR, slug);
    const indexPath = path.join(projectDir, "index.md");
    if (!existsSync(indexPath)) {
      warnings.push(`${slug}: no index.md - skipped`);
      continue;
    }

    const { data } = matter(await readFile(indexPath, "utf8"));
    const title = data.title ?? slug;
    projects.push({ slug, title, category: data.category ?? "", order: data.order ?? 999 });

    // Optional sidecar: { "01-hero.jpg": "Courtyard seen from the stair" }
    let alts = {};
    const altPath = path.join(projectDir, "images", "alt.json");
    if (existsSync(altPath)) {
      try {
        alts = JSON.parse(await readFile(altPath, "utf8"));
      } catch {
        warnings.push(`${slug}: images/alt.json is not valid JSON - ignored`);
      }
    }

    const allSources = orderSources(await collectSources(path.join(projectDir, "images")), data);
    // `allImages: true` in index.md frontmatter opts a project out of the cap.
    const sources = data.allImages ? allSources : allSources.slice(0, MAX_IMAGES);
    if (sources.length === 0) {
      warnings.push(`${slug}: no images found`);
      manifest[slug] = [];
      continue;
    }

    const entries = [];
    for (const [index, [name, srcPath]] of sources.entries()) {
      const hash = await sourceHash(srcPath);
      const cached = previous[slug]?.find((e) => e.src === name);

      if (cached && cached._hash === hash && existsSync(path.join(OUT_DIR, slug))) {
        entries.push({ ...cached, alt: alts[name] ?? cached.alt });
        reused++;
        continue;
      }

      try {
        const entry = await processImage({
          slug,
          name,
          srcPath,
          title,
          altOverride: alts[name],
          index,
        });
        entries.push({ ...entry, _hash: hash });
        processed++;
      } catch (err) {
        warnings.push(`${slug}/${name}: ${err.message}`);
      }
    }

    manifest[slug] = entries;
    console.log(`images: ${slug} - ${entries.length} image(s)`);
  }

  // Single images chosen in /admin -> Settings. Stored as repo paths such as
  // "/content/services/interior.jpg". Each lands in its own media folder.
  async function settingsImage(group, repoPath, alt) {
    if (!repoPath) return null;
    const srcPath = path.join(ROOT, repoPath.replace(/^\/+/, ""));
    if (!existsSync(srcPath)) {
      warnings.push(`${group}: ${repoPath} not found`);
      return null;
    }
    const name = path.basename(srcPath);
    const hash = await sourceHash(srcPath);
    const cached = previous[group]?.find((e) => e && e.src === name);
    if (cached && cached._hash === hash && existsSync(path.join(OUT_DIR, group))) {
      reused++;
      return { ...cached, alt };
    }
    processed++;
    const entry = await processImage({
      slug: group,
      name,
      srcPath,
      title: alt,
      altOverride: alt,
      index: 0,
    });
    return { ...entry, _hash: hash };
  }

  const siteSettings = JSON.parse(
    await readFile(path.join(ROOT, "content", "settings", "services.json"), "utf8"),
  );
  // Null keeps a service without an image from shifting the rest along.
  manifest.services = [];
  for (const service of siteSettings.services ?? []) {
    manifest.services.push(await settingsImage("services", service.image, service.title));
  }

  const studioSettings = JSON.parse(
    await readFile(path.join(ROOT, "content", "settings", "studio.json"), "utf8"),
  );
  const portrait = await settingsImage(
    "studio",
    studioSettings.founder?.portrait,
    studioSettings.founder?.name ?? "Portrait",
  );
  manifest.studio = portrait ? [portrait] : [];

  // Reel videos present in this build. The site checks reels against this list
  // rather than the disk: files under public/ are not readable from the server
  // when a page re-renders after an /admin save.
  manifest.reelFiles = (await listDir(path.join(ROOT, "public", "reels")))
    // Not the phone cuts (-sm.mp4) - they are variants of a reel, not reels.
    .filter(
      (entry) => entry.isFile() && /\.mp4$/i.test(entry.name) && !/-sm\.mp4$/i.test(entry.name),
    )
    .map((entry) => entry.name.replace(/\.mp4$/i, ""));

  await mkdir(path.dirname(MANIFEST), { recursive: true });
  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

  // Drop derivatives for projects that no longer exist, so deleted work does
  // not keep shipping in the deploy.
  if (existsSync(OUT_DIR)) {
    const keep = new Set([...slugs, "og", "services", "studio"]);
    for (const entry of await listDir(OUT_DIR)) {
      if (entry.isDirectory() && !keep.has(entry.name)) {
        await rm(path.join(OUT_DIR, entry.name), { recursive: true, force: true });
        console.log(`pruned stale media: ${entry.name}`);
      }
    }
  }

  // Social cards and app icons reuse the derivatives just generated.
  projects.sort((a, b) => a.order - b.order);
  const brand = await readBrand(ROOT);
  const og = await buildOgCards({ root: ROOT, manifest, projects, brand });
  const icons = await buildIcons({ root: ROOT, brand });
  warnings.push(...og.warnings, ...icons.warnings);

  const total = Object.entries(manifest)
    .filter(([key]) => key !== "reelFiles")
    .reduce((n, [, v]) => n + v.filter(Boolean).length, 0);
  console.log(
    `images: ${slugs.length} project(s), ${total} image(s) - ${processed} processed, ${reused} reused`,
  );
  console.log(`assets: ${og.count} OG card(s), ${icons.count} icon(s)`);

  if (SAVE_BUILD_CACHE) {
    await rm(BUILD_CACHE, { recursive: true, force: true });
    await mkdir(BUILD_CACHE, { recursive: true });
    await cp(OUT_DIR, path.join(BUILD_CACHE, "media"), { recursive: true });
    await cp(MANIFEST, path.join(BUILD_CACHE, "images.json"));
    console.log("images: saved derivatives to the build cache");
  }
  for (const w of warnings) console.warn(`  warn: ${w}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
