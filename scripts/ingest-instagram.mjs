#!/usr/bin/env node
/**
 * Instagram "Download Your Information" export -> draft project folders.
 *
 * Usage:
 *   npm run ingest                      # read ./instagram-export, write ./content/_drafts
 *   npm run ingest -- --dry-run         # report only, write nothing
 *   npm run ingest -- --min-images 3    # skip posts with fewer than 3 images
 *   npm run ingest -- --include-video   # keep posts whose media is video
 *   npm run ingest -- --export <path>   # point at a different export directory
 *
 * This writes ONLY to content/_drafts/. It never touches content/projects/, so
 * re-running it can never clobber curated work.
 *
 * The drafts are a starting point, not the finished thing. The export contains
 * everything ever posted - reels, story highlights, festival greetings, reposts,
 * and several posts of the same building. Merging and deleting is a human job;
 * see the curation notes printed at the end of a run.
 */
import { readFile, readdir, mkdir, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const FLAGS = {
  dryRun: process.argv.includes("--dry-run"),
  includeVideo: process.argv.includes("--include-video"),
  minImages: Number(arg("min-images", 1)),
  exportDir: path.resolve(ROOT, arg("export", "instagram-export")),
  outDir: path.join(ROOT, "content", "_drafts"),
};

// ---------------------------------------------------------------------------
// Meta's JSON export is double-encoded: UTF-8 bytes reinterpreted as Latin-1.
// Without this repair every apostrophe becomes a-circumflex-euro-tm and every
// m-squared becomes mojibake, and it ends up baked into the live site.
// ---------------------------------------------------------------------------
function fixMojibake(value) {
  if (typeof value !== "string") return value;
  if (!/[Â-Ãâ]/.test(value)) return value;
  try {
    const repaired = Buffer.from(value, "latin1").toString("utf8");
    // Only accept the repair if it did not introduce replacement characters.
    return repaired.includes("�") ? value : repaired;
  } catch {
    return value;
  }
}

function deepFix(node) {
  if (typeof node === "string") return fixMojibake(node);
  if (Array.isArray(node)) return node.map(deepFix);
  if (node && typeof node === "object") {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, deepFix(v)]));
  }
  return node;
}

// ---------------------------------------------------------------------------
// Locating the posts JSON. Meta has shipped at least two layouts:
//   your_instagram_activity/media/posts_1.json   (current)
//   content/posts_1.json                         (older)
// Rather than hard-code either, walk the export and match on filename.
// ---------------------------------------------------------------------------
async function findPostFiles(dir, depth = 0, found = []) {
  if (depth > 6) return found;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "media" && depth === 0) continue; // the media blob, not metadata
      await findPostFiles(full, depth + 1, found);
    } else if (/^posts_\d+\.json$/i.test(entry.name)) {
      found.push(full);
    }
  }
  return found;
}

async function printTree(dir, depth = 0, lines = []) {
  if (depth > 2) return lines;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return lines;
  }
  for (const entry of entries.slice(0, 12)) {
    lines.push(`${"  ".repeat(depth)}${entry.name}${entry.isDirectory() ? "/" : ""}`);
    if (entry.isDirectory()) await printTree(path.join(dir, entry.name), depth + 1, lines);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const IMAGE_RE = /\.(jpe?g|png|webp|heic)$/i;
const VIDEO_RE = /\.(mp4|mov|m4v)$/i;

function slugify(input) {
  return (
    input
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      // Strip hashtags, mentions and emoji before slugifying.
      .replace(/[#@][\w.]+/g, " ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .split("-")
      .filter(Boolean)
      .slice(0, 6)
      .join("-") || "untitled"
  );
}

/** First meaningful line of a caption, cleaned of hashtags and trailing punctuation. */
function captionTitle(caption) {
  const firstLine = (caption || "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith("#"));
  if (!firstLine) return "";
  return firstLine
    .replace(/[#@][\w.]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.!|·---]+$/, "")
    .trim();
}

function summarise(caption) {
  const text = (caption || "")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#"))
    .join(" ")
    .replace(/[#@][\w.]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= 160) return text;
  const cut = text.slice(0, 160);
  return cut.slice(0, cut.lastIndexOf(" ")) + "...";
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function buildFrontmatter({ title, year, summary, sourceUrl, hero, imageCount }) {
  return [
    "---",
    `title: ${yamlString(title)}`,
    `# TODO: one of architecture | interior | construction`,
    `category: "architecture"`,
    `tags: []`,
    `# TODO: e.g. "Nagpur, Maharashtra"`,
    `location: "TODO"`,
    `# TODO: built-up area in square metres (a number, not a string)`,
    `area: 0`,
    `year: ${year}`,
    `# completed | ongoing`,
    `status: "completed"`,
    `# TODO: client name, or "Private" / "Confidential"`,
    `client: "Private"`,
    `scope: []`,
    `featured: false`,
    `order: 999`,
    `hero: ${yamlString(hero)}`,
    `summary: ${yamlString(summary || "TODO: one line describing the project")}`,
    ...(sourceUrl ? [`sourceUrl: ${yamlString(sourceUrl)}`] : []),
    `# ${imageCount} image(s) imported from Instagram. Review, reorder and rename;`,
    `# drop full-resolution files into images/_originals/ to replace them.`,
    "---",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!existsSync(FLAGS.exportDir)) {
    console.error(`\nNo export found at: ${FLAGS.exportDir}\n`);
    console.error("Get one from Instagram:");
    console.error("  Settings -> Accounts Centre -> Your information and permissions");
    console.error("  -> Download your information -> All available information");
    console.error("  -> Download to device -> Format: JSON, Date range: All time, Quality: High");
    console.error(`\nThen unzip it into ${path.relative(ROOT, FLAGS.exportDir)}/\n`);
    process.exit(1);
  }

  const postFiles = await findPostFiles(FLAGS.exportDir);
  if (postFiles.length === 0) {
    console.error(`\nFound the export directory but no posts_*.json inside it.`);
    console.error(`Make sure the download format was JSON, not HTML.\n`);
    console.error(`What is actually in ${path.relative(ROOT, FLAGS.exportDir)}:`);
    console.error((await printTree(FLAGS.exportDir)).map((l) => `  ${l}`).join("\n"));
    process.exit(1);
  }

  const posts = [];
  for (const file of postFiles) {
    const parsed = deepFix(JSON.parse(await readFile(file, "utf8")));
    if (Array.isArray(parsed)) posts.push(...parsed);
  }

  const stats = { found: posts.length, written: 0, skippedVideo: 0, skippedFew: 0, failed: 0 };
  const usedSlugs = new Map();
  const report = [];

  for (const post of posts) {
    const media = Array.isArray(post.media) ? post.media : [];
    const images = media.filter((m) => m.uri && IMAGE_RE.test(m.uri));
    const videos = media.filter((m) => m.uri && VIDEO_RE.test(m.uri));

    if (images.length === 0 && videos.length > 0 && !FLAGS.includeVideo) {
      stats.skippedVideo++;
      continue;
    }
    if (images.length < FLAGS.minImages) {
      stats.skippedFew++;
      continue;
    }

    // Carousels carry the caption at the top level; single posts often only on
    // the first media item.
    const caption = post.title || media[0]?.title || "";
    const timestamp = post.creation_timestamp || media[0]?.creation_timestamp || 0;
    const year = timestamp ? new Date(timestamp * 1000).getFullYear() : new Date().getFullYear();

    const titleText = captionTitle(caption);
    let slug = slugify(titleText || `post-${year}`);

    // Two posts can easily produce the same slug - keep both, numbered.
    const seen = usedSlugs.get(slug) ?? 0;
    usedSlugs.set(slug, seen + 1);
    if (seen > 0) slug = `${slug}-${seen + 1}`;

    const destDir = path.join(FLAGS.outDir, slug);
    const imagesDir = path.join(destDir, "images");

    const copied = [];
    if (!FLAGS.dryRun) {
      await mkdir(imagesDir, { recursive: true });
    }

    for (const [i, item] of images.entries()) {
      // `uri` is relative to the export root, but which directory that is has
      // varied between export versions - try the obvious candidates.
      const candidates = [
        path.join(FLAGS.exportDir, item.uri),
        path.join(FLAGS.exportDir, "your_instagram_activity", item.uri),
        path.join(FLAGS.exportDir, path.basename(path.dirname(item.uri)), path.basename(item.uri)),
      ];
      const source = candidates.find((c) => existsSync(c));
      if (!source) {
        stats.failed++;
        report.push(`  ! ${slug}: media not found on disk (${item.uri})`);
        continue;
      }

      const ext = path.extname(source).toLowerCase();
      const name = i === 0 ? `01-hero${ext}` : `${String(i + 1).padStart(2, "0")}${ext}`;
      copied.push(name);
      if (!FLAGS.dryRun) await copyFile(source, path.join(imagesDir, name));
    }

    if (copied.length === 0) continue;

    if (!FLAGS.dryRun) {
      const frontmatter = buildFrontmatter({
        title: titleText || `Untitled project (${year})`,
        year,
        summary: summarise(caption),
        sourceUrl: undefined, // the export does not include post permalinks
        hero: copied[0],
        imageCount: copied.length,
      });

      const body = [
        "<!-- Original Instagram caption, kept for reference. Rewrite this into a",
        "     proper project description, then delete this block. -->",
        "",
        (caption || "").trim() || "TODO: write the project description.",
        "",
      ].join("\n");

      await writeFile(path.join(destDir, "index.md"), frontmatter + body);
    }

    stats.written++;
    report.push(`  + ${slug} (${copied.length} images, ${year})`);
  }

  // -------------------------------------------------------------------------
  console.log("");
  console.log(`Instagram ingest${FLAGS.dryRun ? " (dry run - nothing written)" : ""}`);
  console.log(`  source        ${path.relative(ROOT, FLAGS.exportDir)}`);
  console.log(`  posts found   ${stats.found}`);
  console.log(`  drafts        ${stats.written}`);
  console.log(`  skipped video ${stats.skippedVideo}`);
  console.log(`  skipped few   ${stats.skippedFew} (fewer than ${FLAGS.minImages} image(s))`);
  if (stats.failed) console.log(`  media missing ${stats.failed}`);
  console.log("");
  if (report.length) console.log(report.slice(0, 60).join("\n"));
  if (report.length > 60) console.log(`  ... and ${report.length - 60} more`);

  console.log(`
Next - curation (the important part):

  1. Open content/_drafts/ and read through it.
  2. DELETE anything that is not a project: reels, greetings, reposts, team photos.
  3. MERGE posts that show the same project into one folder, renumbering images.
  4. Fill in every TODO in each index.md - category, location, area, client, scope.
  5. Rewrite the caption block into a real description.
  6. MOVE the keepers into content/projects/, then run: npm run images

Aim for 8-12 strong projects. Everything you post is not a portfolio.
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
