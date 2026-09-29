/**
 * Open Graph cards and the app icon set.
 *
 * Called from scripts/build-images.mjs once the image manifest exists, so it
 * can reuse the already-processed hero derivatives instead of re-reading
 * originals.
 *
 * A note on typography: sharp rasterises SVG through librsvg/resvg, which
 * resolves fonts through the host's font config. The build machine will not
 * have Manrope, so the stack falls back to whatever generic sans is installed
 * (DejaVu Sans on most Linux CI images, Arial on Windows). The cards therefore
 * will not match the site's typeface exactly. That is an accepted trade: a
 * consistent, legible card everywhere beats an exact one that renders blank
 * wherever the font is missing. Failures here warn rather than fail the build.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const FONT_STACK = "Manrope, Inter, DejaVu Sans, Arial, Helvetica, sans-serif";

/** Mirrors the tokens in src/app/globals.css, which are sampled from the logo. */
const INK = "#1A2333";
const BONE = "#F4F3F0";
const STONE = "#98A0AE";
const ACCENT = "#3E5A86";

/** XML-escape text going into an SVG. */
function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Greedy word wrap - librsvg has no automatic text flow. */
function wrap(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);

  // Signal truncation rather than silently dropping words.
  if (lines.length === maxLines) {
    const consumed = lines.join(" ").split(/\s+/).length;
    if (consumed < words.length) lines[maxLines - 1] = `${lines[maxLines - 1]}…`;
  }
  return lines;
}

function cardSvg({ wordmark, eyebrow, title }) {
  const titleLines = wrap(title, 28, 3);
  const fontSize = titleLines.length > 2 ? 62 : 76;
  const lineHeight = fontSize * 1.1;
  // Bottom-anchored block.
  const firstBaseline = OG_HEIGHT - 72 - (titleLines.length - 1) * lineHeight;

  const titleTspans = titleLines
    .map(
      (line, i) =>
        `<text x="72" y="${firstBaseline + i * lineHeight}" fill="${BONE}" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="600" letter-spacing="-1.5">${esc(line)}</text>`,
    )
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${INK}" stop-opacity="0.92"/>
      <stop offset="55%" stop-color="${INK}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${INK}" stop-opacity="0.35"/>
    </linearGradient>
  </defs>
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#scrim)"/>
  <text x="72" y="86" fill="${BONE}" font-family="${FONT_STACK}" font-size="24" font-weight="600" letter-spacing="6">${esc(wordmark)}</text>
  ${eyebrow ? `<text x="72" y="${OG_HEIGHT - 132}" fill="${STONE}" font-family="${FONT_STACK}" font-size="22" font-weight="500" letter-spacing="4">${esc(eyebrow.toUpperCase())}</text>` : ""}
  ${titleTspans}
  <rect x="72" y="${OG_HEIGHT - 40}" width="96" height="4" fill="${ACCENT}"/>
</svg>`;
}

/** Composites one card: background photo, scrim, text. */
async function renderCard({ backgroundPath, wordmark, eyebrow, title, outPath }) {
  const background = existsSync(backgroundPath)
    ? sharp(backgroundPath).resize({ width: OG_WIDTH, height: OG_HEIGHT, fit: "cover" })
    : sharp({
        create: {
          width: OG_WIDTH,
          height: OG_HEIGHT,
          channels: 3,
          background: INK,
        },
      });

  const overlay = Buffer.from(cardSvg({ wordmark, eyebrow, title }));
  await background
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(outPath);
}

/**
 * @param root        repo root
 * @param manifest    output of the image pipeline
 * @param projects    [{ slug, title, category, hero }]
 */
export async function buildOgCards({ root, manifest, projects, brand }) {
  const outDir = path.join(root, "public", "media", "og");
  await mkdir(outDir, { recursive: true });

  const warnings = [];
  let count = 0;

  const heroFileFor = (slug) => {
    const entry = manifest[slug]?.[0];
    if (!entry) return null;
    // Reuse the 1200px derivative - already the right width for an OG card.
    const width = entry.widths.includes(1200) ? 1200 : entry.fallbackWidth;
    return path.join(root, "public", `${entry.stem.replace(/^\//, "")}-${width}.jpg`);
  };

  // A per-project card.
  for (const project of projects) {
    const hero = heroFileFor(project.slug);
    // Only the fallback JPEG exists on disk at every width, so fall back to the
    // largest one if the 1200 variant was not generated.
    const background =
      hero && existsSync(hero)
        ? hero
        : (() => {
            const entry = manifest[project.slug]?.[0];
            return entry
              ? path.join(
                  root,
                  "public",
                  `${entry.stem.replace(/^\//, "")}-${entry.fallbackWidth}.jpg`,
                )
              : "";
          })();

    try {
      await renderCard({
        backgroundPath: background,
        wordmark: brand.shortName,
        eyebrow: project.category,
        title: project.title,
        outPath: path.join(outDir, `${project.slug}.jpg`),
      });
      count++;
    } catch (err) {
      warnings.push(`og/${project.slug}: ${err.message}`);
    }
  }

  // The default card, used by the home page and every non-project route.
  try {
    const first = projects[0];
    const entry = first ? manifest[first.slug]?.[0] : null;
    const background = entry
      ? path.join(root, "public", `${entry.stem.replace(/^\//, "")}-${entry.fallbackWidth}.jpg`)
      : "";

    await renderCard({
      backgroundPath: background,
      wordmark: brand.shortName,
      eyebrow: brand.disciplines?.replace(/\s*·\s*/g, " / "),
      title: brand.tagline,
      outPath: path.join(outDir, "default.jpg"),
    });
    count++;
  } catch (err) {
    warnings.push(`og/default: ${err.message}`);
  }

  return { count, warnings };
}

/**
 * App icons. Generated from the same wordmark as src/app/icon.svg so the
 * browser tab, the iOS home screen and the manifest all agree.
 */
export async function buildIcons({ root, brand }) {
  const outDir = path.join(root, "public", "icons");
  await mkdir(outDir, { recursive: true });

  /**
   * @param radius   corner radius in the 64-unit viewBox; 0 draws a full bleed
   * @param fontSize wordmark size in the same units
   *
   * The baseline is offset by roughly half the cap height so the wordmark sits
   * on the optical centre rather than the text origin.
   */
  const svg = (radius, fontSize) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64"${radius ? ` rx="${radius}"` : ""} fill="${INK}"/>
  <text x="32" y="${(32 + fontSize * 0.355).toFixed(2)}" text-anchor="middle" fill="${BONE}" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="600" letter-spacing="1">${esc(brand.shortName)}</text>
</svg>`;

  const targets = [
    // Browser tab, and the Android "any" icon: rounded, as drawn.
    { name: "icon-192.png", size: 192, radius: 10, fontSize: 24 },
    { name: "icon-512.png", size: 512, radius: 10, fontSize: 24 },
    // iOS applies its own squircle mask and composites anything transparent
    // onto white. This one used to carry the rounded corners, which is exactly
    // what produced a white fringe around the icon on the home screen: full
    // bleed and flattened, so there is no alpha left to composite.
    { name: "apple-touch-icon.png", size: 180, radius: 0, fontSize: 24, flatten: true },
    // Android adaptive icons crop to whichever shape the launcher uses and only
    // guarantee the middle 80%. Full bleed, with the wordmark pulled well
    // inside that safe zone - at the size the others use it would be clipped.
    { name: "icon-maskable-512.png", size: 512, radius: 0, fontSize: 17, flatten: true },
  ];

  const warnings = [];
  for (const target of targets) {
    try {
      let pipeline = sharp(Buffer.from(svg(target.radius, target.fontSize))).resize(
        target.size,
        target.size,
      );
      if (target.flatten) pipeline = pipeline.flatten({ background: INK });
      await pipeline.png().toFile(path.join(outDir, target.name));
    } catch (err) {
      warnings.push(`icons/${target.name}: ${err.message}`);
    }
  }
  return { count: targets.length - warnings.length, warnings };
}

/** Reads content/brand.json. */
export async function readBrand(root) {
  return JSON.parse(await readFile(path.join(root, "content", "brand.json"), "utf8"));
}

export { writeFile };
