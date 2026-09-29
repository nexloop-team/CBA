#!/usr/bin/env node
/**
 * One-off import of the client's Google Drive asset drop.
 *
 * Reads a staging folder of original files and writes:
 *   - public/brand/  logo lockups in both colourways
 *   - content/projects/<slug>/images/  grouped, ordered project photography
 *
 * Usage:
 *   node scripts/import-drive-assets.mjs --from <staging-dir> [--brand-only]
 *
 * Safe to re-run: it rewrites images but never touches an existing index.md,
 * so curated frontmatter survives.
 */
import { mkdir, copyFile, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const FROM = path.resolve(arg("from", "drive-dl"));
const BRAND_ONLY = process.argv.includes("--brand-only");

/**
 * Project groupings, derived from the source filenames.
 *
 * `title` is the practice's own name for the work where the filename gave one.
 * Everything else is a placeholder for the client to fill in - see the TODO
 * markers written into each index.md.
 */
const GROUPS = [
  {
    slug: "gaikwad-residence",
    title: "Gaikwad Residence",
    category: "architecture",
    status: "ongoing",
    medium: "visualisation",
    files: ["GAIKWAD RESIDENCE 01.jpg", "GAIKWAD RESIDENCE 03.jpg", "GAIKWAD RESIDENCE 06.jpg"],
  },
  {
    slug: "nandvihar",
    title: "Nandvihar",
    category: "architecture",
    status: "ongoing",
    medium: "visualisation",
    files: [
      "NANDVIHAR 03.jpg",
      "NANDVIHAR 04.jpg",
      "NANDVIHAR 05.jpg",
      "NANDVIHAR 06.jpg",
      "NANDVIHAR 07.jpg",
    ],
  },
  {
    slug: "sbr-residence",
    title: "SBR Residence",
    category: "interior",
    status: "ongoing",
    medium: "visualisation",
    files: [
      "SBR LIVING 02.jpg",
      "SBR LIVING 05.jpg",
      "SBR KITCHEN 01.jpg",
      "SBR MASTER BEDROOM 01.jpg",
      "SBR DAUGHTER BEDROOM 01.jpg",
      "SBR DAUGHTER BEDROOM 04.jpg",
      "SBR SONS BEDROOM 01.jpg",
    ],
  },
  {
    slug: "vijay-kolekar-residence",
    title: "Vijay Kolekar Residence",
    category: "architecture",
    status: "ongoing",
    medium: "visualisation",
    files: [
      "VIJAY KOLEKAR VIEW 04.jpg",
      "VIJAY KOLEKAR VIEW 10.jpg",
      "VIJAY KOLEKAR VIEW 08.jpg",
      "VIJAY KOLEKAR VIEW 05.jpg",
      "VIJAY KOLEKAR VIEW 01.jpg",
    ],
  },
];

/**
 * The supplied lockups are white artwork on transparency, which is invisible on
 * the site's light background. Recolour via the alpha channel to produce an ink
 * version, keeping the original as the light-on-dark variant.
 */
async function makeColourways(sourcePath, baseName, outDir) {
  const INK = { r: 0x1a, g: 0x23, b: 0x33 };

  // Light variant: the original white artwork, just optimised.
  await sharp(sourcePath)
    .resize({ width: 1600, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(outDir, `${baseName}-light.png`));

  // Dark variant: solid ink masked by the original's alpha channel.
  const resized = await sharp(sourcePath)
    .resize({ width: 1600, withoutEnlargement: true })
    .ensureAlpha()
    .toBuffer();
  const { width, height } = await sharp(resized).metadata();
  const alpha = await sharp(resized).extractChannel(3).toBuffer();

  await sharp({
    create: { width, height, channels: 3, background: INK },
  })
    .joinChannel(alpha)
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, `${baseName}-dark.png`));

  return { width, height };
}

async function importBrand() {
  const outDir = path.join(ROOT, "public", "brand");
  await mkdir(outDir, { recursive: true });

  const lockups = [
    // 11.png - mark left, wordmark right. The header lockup.
    { file: "11.png", name: "logo-horizontal" },
    // 1.png - mark above, wordmark below. For the footer and share cards.
    { file: "1.png", name: "logo-stacked" },
  ];

  for (const lockup of lockups) {
    const src = path.join(FROM, lockup.file);
    if (!existsSync(src)) {
      console.warn(`  warn: ${lockup.file} not found in ${FROM}`);
      continue;
    }
    const dims = await makeColourways(src, lockup.name, outDir);
    console.log(`brand: ${lockup.name} (${dims.width}x${dims.height}) light + dark`);
  }
}

function frontmatter(group, heroName) {
  const lines = [
    "---",
    `title: ${JSON.stringify(group.title)}`,
  ];
  if (group.titleIsPlaceholder) {
    lines.push(
      `# TODO(client): the source files carried no project name - set the real one.`,
    );
  }
  lines.push(
    `category: ${JSON.stringify(group.category)}   # architecture | interior | engineering`,
    `tags: ["residential"]`,
    `# TODO(client): city and state`,
    `location: "TODO"`,
    `# TODO(client): built-up area in square metres, as a number`,
    `area: 0`,
    `# TODO(client): year of completion, or expected completion. 0 = unknown,`,
    `# which keeps it off the page rather than asserting a guess.`,
    `year: 0`,
    `status: ${JSON.stringify(group.status)}`,
    `client: "Private"`,
    `scope: []`,
    `featured: true`,
    `order: ${group.order}`,
    `hero: ${JSON.stringify(heroName)}`,
    `# TODO(client): one line, used on cards and as the page description`,
    `summary: "TODO"`,
    "---",
    "",
    "TODO(client): write the project description.",
    "",
    group.medium === "visualisation"
      ? "<!-- These images are design visualisations rather than photographs of\n     completed work. Worth saying so on the page once the copy is written. -->"
      : "<!-- Photographs of completed work. -->",
    "",
  );
  return lines.join("\n");
}

async function importProjects() {
  const projectsDir = path.join(ROOT, "content", "projects");
  let imported = 0;
  const missing = [];

  for (const [index, group] of GROUPS.entries()) {
    group.order = index + 1;
    const dir = path.join(projectsDir, group.slug);
    const imagesDir = path.join(dir, "images");

    // Rewrite imagery from scratch so ordering changes take effect.
    if (existsSync(imagesDir)) await rm(imagesDir, { recursive: true, force: true });
    await mkdir(imagesDir, { recursive: true });

    let n = 0;
    let heroName = null;
    for (const file of group.files) {
      const src = path.join(FROM, file);
      if (!existsSync(src)) {
        missing.push(`${group.slug}: ${file}`);
        continue;
      }
      n += 1;
      const name = n === 1 ? "01-hero.jpg" : `${String(n).padStart(2, "0")}.jpg`;
      if (n === 1) heroName = name;
      await copyFile(src, path.join(imagesDir, name));
      imported += 1;
    }

    if (!heroName) {
      missing.push(`${group.slug}: no images found - skipped`);
      continue;
    }

    // Never clobber frontmatter the client has already filled in.
    const indexPath = path.join(dir, "index.md");
    if (existsSync(indexPath)) {
      const existing = await readFile(indexPath, "utf8");
      if (!existing.includes('summary: "TODO"')) {
        console.log(`project: ${group.slug} - ${n} images (kept existing index.md)`);
        continue;
      }
    }
    await writeFile(indexPath, frontmatter(group, heroName));
    console.log(`project: ${group.slug} - ${n} images`);
  }

  console.log(`\nimported ${imported} image(s) across ${GROUPS.length} project(s)`);
  if (missing.length) {
    console.warn("missing:");
    for (const m of missing) console.warn(`  ${m}`);
  }
}

if (!existsSync(FROM)) {
  console.error(`Staging folder not found: ${FROM}`);
  process.exit(1);
}

await importBrand();
if (!BRAND_ONLY) await importProjects();
