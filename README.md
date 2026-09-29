# Chetan Borkar Associates - website

Portfolio site for an architecture, interior and engineering practice, built
with Next.js and deployed on Vercel from `github.com/nexloop-team/CBA`. Every
page is prerendered to static HTML; the only server code is the GitHub login for
the content editor at `/admin`. Content lives in `content/` as Markdown and JSON.

---

## Quick start

```bash
npm install
npm run images     # generate image derivatives (required once before `dev`)
npm run dev        # http://localhost:3000
```

To produce the deployable site:

```bash
npm run build      # runs `images` then `next build`
npm start          # serves the production build locally
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Images + production build |
| `npm start` | Serve the production build locally |
| `npm run admin` | Content editor at http://localhost:3000/admin, saving to this computer |
| `npm run images` | Regenerate image derivatives, social cards and icons |
| `npm run images -- --force` | Clear `public/media` and rebuild everything |
| `npm run ingest` | Convert an Instagram export into draft projects |
| `npm run lint` / `npm run typecheck` / `npm run format` | Checks |

There is also a one-off importer, `scripts/import-drive-assets.mjs`, used to
bring in the original asset drop. See **Importing a folder of originals**.

---

## Where the content lives

Everything editable is under `content/`. Nothing in `src/` needs touching to
add a project or change a phone number.

```
content/
├─ brand.json         name, short name, tagline, discipline line
├─ site.ts            email, phone, WhatsApp, address, nav, services
├─ studio.ts          studio copy, founder, pillars, process, stats
├─ testimonials.ts    client quotes
└─ projects/
   └─ nandvihar/
      ├─ index.md     frontmatter + description
      └─ images/      01-hero.jpg, 02.jpg, 03.jpg, ...
```

`content/brand.json` is shared with the build scripts, which cannot import
TypeScript. Change the practice name or discipline line there and it updates the
header, footer, hero, social cards and app icons together.

### Adding a project

1. Make a folder: `content/projects/my-project/` (the folder name is the URL).
2. Drop images into `content/projects/my-project/images/`. Name the hero
   `01-hero.jpg`; the rest are shown in filename order.
3. Create `index.md`:

```yaml
---
title: "Nandvihar"
category: "architecture"        # architecture | interior | engineering
tags: ["residential"]
location: "Nagpur, Maharashtra"
area: 340                       # square metres, a number - shown as m² and sq ft
year: 2024
status: "completed"             # completed | ongoing
client: "Private"
scope: ["Architecture", "Interior", "Site Supervision"]
featured: true                  # appears in the home page carousel
order: 1                        # lower numbers come first
hero: "01-hero.jpg"
summary: "One line - used on cards and as the page description."
---

The long description. Plain Markdown. Blank line between paragraphs.
Comments must be MDX-style: {/* like this */}, not HTML comments.
```

4. Run `npm run images`, then `npm run dev`.

### Placeholders vs errors

The build treats two kinds of incomplete content very differently.

**Structural problems fail the build** - no images, a `hero` that is not on
disk, an unknown `category`, a missing `title` or `year`. These mean the page
cannot render correctly, and the error names the file and the problem.

**Unfilled details do not.** `area: 0`, `location: "TODO"`, `summary: "TODO"`
and `client: "TODO"` are understood to mean *not decided yet*. Those fields are
**omitted from the page** rather than rendered as `0 m²` or the word `TODO`, and
the build prints a summary of what is still outstanding:

```
content: 6 project(s) still have placeholder fields (omitted from the page):
  private-residence -> location, area, summary
  gaikwad-residence -> location, area, summary
```

This exists so real photography can go live before every measurement is
confirmed, without placeholder text leaking onto the site. Fill the fields in
and the metadata appears automatically.

### Better image alt text (optional)

Alt text defaults to `"<Project title> - image 3"`. To write real descriptions,
add `content/projects/<slug>/images/alt.json`:

```json
{
  "01-hero.jpg": "The courtyard seen from the stair landing",
  "02.jpg": "Brick screen wall against the evening sky"
}
```

### Replacing an image with a higher-resolution original

`content/projects/<slug>/images/_originals/` takes precedence over
`images/` when a file of the same base name exists there. Useful when a
low-resolution version is in place and the original arrives later - no content
edits, no renaming:

```
images/01-hero.jpg              <- whatever is in place now
images/_originals/01-hero.jpg   <- the original - this one wins
```

---

## Importing a folder of originals

`scripts/import-drive-assets.mjs` groups a flat folder of files into projects
and produces both logo colourways. It was written for the initial asset drop and
is re-runnable.

```bash
node scripts/import-drive-assets.mjs --from ../staging-folder
node scripts/import-drive-assets.mjs --from ../staging-folder --brand-only
```

Project groupings are declared in the `GROUPS` array at the top of that file -
edit it to regroup, reorder or add work. The script:

- copies and renumbers each group's images (`01-hero.jpg`, `02.jpg`, …)
- writes an `index.md` with `TODO` markers for everything it cannot know
- **never overwrites an `index.md` you have already filled in**

The supplied logo lockups are white artwork on transparency, which is invisible
on the site's light background. The script recolours them via the alpha channel
to produce an ink version, so `public/brand/` ends up with:

```
logo-horizontal-light.png   mark + wordmark, white   (footer, dark sections)
logo-horizontal-dark.png    mark + wordmark, ink     (header, light background)
logo-stacked-light.png      stacked, white
logo-stacked-dark.png       stacked, ink
```

---

## Importing from Instagram

An alternative source, if the original files are not available. Post content
cannot be scraped - it is behind a login wall - so use Meta's export.

1. Settings → **Accounts Centre** → Your information and permissions →
   **Download your information** → the account → **All available information** →
   **Download to device**
2. Format: **JSON** (not HTML) · Date range: **All time** · Media quality: **High**
3. Unzip into `instagram-export/` at the repo root (gitignored)
4. `npm run ingest -- --dry-run`, then `npm run ingest -- --min-images 2`

Options: `--min-images <n>`, `--include-video`, `--export <path>`, `--dry-run`.
It writes to `content/_drafts/` only and never touches `content/projects/`.

Then curate: delete anything that is not a project, merge posts showing the same
building, fill in the `TODO`s, and move the keepers into `content/projects/`.

Two things worth knowing: Instagram stores the re-compressed upload, typically
no wider than 1080px, so prefer originals where you have them. And the export's
JSON is double-encoded UTF-8 - the ingest repairs that, which is why apostrophes
and `m²` come through correctly rather than as mojibake.

---

## How the images work

`output: 'export'` disables the Next.js image optimizer, so `next/image` would
only ship unoptimised originals. `scripts/build-images.mjs` generates
derivatives at build time instead:

- AVIF and WebP at 480 / 768 / 1200 / 1800 / 2560px, never upscaled
- a JPEG fallback capped at 1200px - it is only served to browsers supporting
  neither AVIF nor WebP, so generating it at full size tripled the deployed
  media folder for a path essentially nobody takes
- a ~150-byte base64 blur placeholder, applied as a CSS background on the wrapper

`src/components/ui/Figure.tsx` renders these as a `<picture>` with `srcset`.
The manifest lives at `.generated/images.json`. That, `public/media/` and
`public/icons/` are gitignored and rebuilt on every deploy - the *sources* under
`content/projects/*/images/` are what is committed.

The script is incremental: only images whose source changed are reprocessed, and
derivatives for deleted projects are pruned. `--force` clears everything first.

It also produces, from the same run:

- `public/media/og/<slug>.jpg` - 1200×630 social cards, one per project plus a
  default, composited from the hero with the wordmark and title over a scrim
- `public/icons/` - 192, 512 and Apple touch icons

Social card typography note: sharp rasterises SVG through the host's font
config, which will not have Manrope, so the cards fall back to a generic sans.
That is deliberate - a consistent legible card everywhere beats an exact one
that renders blank wherever the font is missing.

---

## Deploying

Vercel builds and deploys every push to `main` with `npm run build`. Image
derivatives are kept in Vercel's build cache (`.next/cache/cba-images`), so only
new or changed photos are encoded; the very first build encodes all of them.

The reel videos in `public/reels/` are not in git (they are large), so the
"In the detail" section hides itself on a deploy that does not have them.

### Editing on the live site (/admin)

Saving on the live site commits to GitHub, and Vercel redeploys a minute or two
later. Signing in needs a GitHub OAuth app, set up once:

1. GitHub -> Settings -> Developer settings -> OAuth Apps -> **New OAuth App**
   (or under the `nexloop-team` organisation's settings).
   - Homepage URL: the site's address, e.g. `https://cba-xxxx.vercel.app`
   - Authorization callback URL: the same address + `/api/callback/`
2. Generate a client secret.
3. Vercel -> the project -> Settings -> Environment Variables: add
   `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET`, then redeploy.
4. Anyone editing needs a GitHub account with write access to the repo. If the
   organisation restricts third-party apps, an owner must approve the OAuth app
   (Organisation settings -> Third-party access).

When the domain changes, update both URLs in the OAuth app.

---

## Before launch

Search the repo for `TODO(client)`. The essentials:

- [ ] **`content/site.ts`** - email, phone, WhatsApp number in E.164 form
      (e.g. `+919876543210`), full studio address, and the live domain in `url`
      (it drives canonical URLs, the sitemap and social cards)
- [ ] **Project details** - `location`, `area`, `year`, `summary` and a written
      description for each project. The build lists what is outstanding.
- [ ] **`private-residence`** - the 15 photographs of the completed house came
      with no project name. Give it its real one and rename the folder.
- [ ] **`content/testimonials.ts`** - replace the placeholders. They are
      attributed to generic roles, not invented people, precisely so they cannot
      ship as though someone said them.
- [ ] **`content/studio.ts`** - founder bio, and verify every number in `stats`
- [ ] **`src/app/studio/page.tsx`** - replace the portrait stand-in with a real
      photograph of the founder
- [ ] **Confirm the third discipline.** The logo reads *Architecture | Interior |
      **Engineering***, while the Instagram bio says *Construction*. The site
      follows the logo. If the bio is right, change `disciplines` in
      `content/brand.json`, the third entry in `site.services`, and the
      `engineering` category in `src/types/project.ts`.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16, App Router, `output: 'export'` |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 - tokens in `src/app/globals.css` under `@theme` |
| Smooth scroll | Lenis, synced to the GSAP ticker |
| Animation | GSAP 3 + ScrollTrigger + SplitText |
| Route transitions | `next-view-transitions`, with a shared-element image morph |
| Content | Markdown + frontmatter (`gray-matter`), MDX bodies |
| Images | Build-time `sharp` pipeline |
| Fonts | Manrope + Inter Tight, variable, self-hosted by `next/font` (~68 KB) |

### Palette

Sampled from the logo, which is navy and white:

```
--color-ink      #1a2333   navy-black - text and dark sections
--color-bone     #f4f3f0   page background
--color-stone    #98a0ae   muted mid tone
--color-accent   #3e5a86   the one invented value: a mid tone from the same
                           navy family, used sparingly for counters and rules
```

### Accessibility and motion

The design carries a lot of movement, so the non-animated path is a real state
rather than a fallback. Under `prefers-reduced-motion: reduce`:

- Lenis is never instantiated - native scroll takes over
- text is never split; the original markup stays intact and visible
- the image rail is not pinned, the carousel does not auto-advance
- counters render their final value immediately
- view transitions are disabled outright

Changing the OS setting while the page is open reloads it, so every animation
re-evaluates. Test on Windows via Settings → Accessibility → Visual effects →
Animation effects **off**.

Content is visible by default and animated *in* by GSAP running in a layout
effect, so with JavaScript disabled the whole site still reads normally.
