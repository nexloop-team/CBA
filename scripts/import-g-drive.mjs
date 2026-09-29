#!/usr/bin/env node
/**
 * Import of the client's G:\ drop: two logos plus five project folders.
 *
 *   node scripts/import-g-drive.mjs [--from G:\]
 *
 * Logos -> public/brand/logo-mark-*.png (header) and logo-full-*.png (footer).
 * Projects -> content/projects/<slug>/images, downscaled to 3600px. An existing
 * index.md is never overwritten, so curated frontmatter survives a re-run.
 */
import { mkdir, readdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const i = process.argv.indexOf("--from");
const FROM = i === -1 ? "G:\\" : process.argv[i + 1];
const INK = { r: 0x1a, g: 0x23, b: 0x33 };

const LOGOS = [
  { file: "main logo small.png", name: "logo-mark" },
  { file: "fulllogo.png", name: "logo-full" },
];

/** Drive folder -> project. `order` continues after the six existing projects. */
const PROJECTS = [
  { dir: "AVANTIKA  AT MOSHI", slug: "avantika-moshi", title: "Avantika", location: "Moshi", category: "architecture", order: 7 },
  { dir: "MUKTAI VILLA AT CHAKAN", slug: "muktai-villa-chakan", title: "Muktai Villa", location: "Chakan", category: "architecture", order: 8 },
  { dir: "SAIKRUPA", slug: "saikrupa", title: "Saikrupa", location: "TODO", category: "architecture", order: 9 },
  { dir: "JAGTAP RESIDENCE INTERIOR", slug: "jagtap-residence-interior", title: "Jagtap Residence Interior", location: "TODO", category: "interior", order: 10 },
  { dir: "MEDANKAR RESIDENCE AT RAVET", slug: "medankar-residence-ravet", title: "Medankar Residence", location: "Ravet", category: "interior", order: 11 },
];

async function importLogos() {
  const out = path.join(ROOT, "public", "brand");
  await mkdir(out, { recursive: true });
  for (const { file, name } of LOGOS) {
    // Trim the transparent padding so the logo sits flush in the header/footer.
    const trimmed = await sharp(path.join(FROM, "logo", file))
      .ensureAlpha()
      .trim({ threshold: 5 })
      .resize({ width: 1600, withoutEnlargement: true })
      .toBuffer();
    const { width, height } = await sharp(trimmed).metadata();
    await sharp(trimmed).png({ compressionLevel: 9 }).toFile(path.join(out, `${name}-light.png`));
    const alpha = await sharp(trimmed).extractChannel(3).toBuffer();
    await sharp({ create: { width, height, channels: 3, background: INK } })
      .joinChannel(alpha)
      .png({ compressionLevel: 9 })
      .toFile(path.join(out, `${name}-dark.png`));
    console.log(`logo: ${name} ${width}x${height}`);
  }
}

/** "THJ KITCHEN 01 B.jpg" -> "kitchen": drops the client prefix, number and suffix. */
function room(file) {
  const s = path
    .parse(file)
    .name.toLowerCase()
    .replace(/^(thj|ssm)\s+/, "")
    .replace(/\s+\d+\s*[a-z]?$/, "")
    .replace(/\s+0b+$/, "")
    .trim();
  return s;
}

const MAX_IMAGES = 6;

/** Hero first, then the rest spread evenly so each room/view is represented. */
function pick(files, max) {
  if (files.length <= max) return files;
  return Array.from({ length: max }, (_, k) => files[Math.round((k * (files.length - 1)) / (max - 1))]);
}

async function importProject(p) {
  const src = path.join(FROM, p.dir);
  const all = (await readdir(src))
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const files = pick(all, MAX_IMAGES);
  const dir = path.join(ROOT, "content", "projects", p.slug);
  const imgs = path.join(dir, "images");
  await rm(imgs, { recursive: true, force: true });
  await mkdir(imgs, { recursive: true });

  const alt = {};
  for (const [n, f] of files.entries()) {
    const name = n === 0 ? "01-hero.jpg" : `${String(n + 1).padStart(2, "0")}.jpg`;
    await sharp(path.join(src, f))
      .rotate()
      .resize({ width: 3600, height: 3600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 92, mozjpeg: true })
      .toFile(path.join(imgs, name));
    const r = p.category === "interior" ? room(f) : "";
    alt[name] = r ? `${p.title} - ${r}` : `${p.title}`;
  }
  await writeFile(path.join(imgs, "alt.json"), JSON.stringify(alt, null, 2) + "\n");

  const indexPath = path.join(dir, "index.md");
  if (!existsSync(indexPath)) {
    await writeFile(
      indexPath,
      [
        "---",
        `title: ${JSON.stringify(p.title)}`,
        `category: ${JSON.stringify(p.category)}   # architecture | interior | engineering`,
        `tags: ["residential"]`,
        p.location === "TODO" ? "# TODO(client): city and state" : `# TODO(client): confirm city and state`,
        `location: ${JSON.stringify(p.location)}`,
        "# TODO(client): built-up area in square metres, as a number",
        "area: 0",
        "# TODO(client): year of completion. 0 = unknown, which keeps it off the page.",
        "year: 0",
        `status: "completed"`,
        `client: "Private"`,
        "scope: []",
        "featured: true",
        `order: ${p.order}`,
        `hero: "01-hero.jpg"`,
        "# TODO(client): one line, used on cards and as the page description",
        `summary: "TODO"`,
        "---",
        "",
        "TODO(client): write the project description.",
        "",
      ].join("\n"),
    );
  }
  console.log(`project: ${p.slug} - ${files.length} images`);
}

await importLogos();
for (const p of PROJECTS) await importProject(p);
