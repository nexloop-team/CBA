/**
 * Decap CMS configuration for /admin.
 *
 * Kept in code rather than a config.yml beside the page: the page is a route
 * handler, and under `output: "export"` a public/admin/ folder would collide
 * with the file it emits.
 *
 * Saving:
 *  - On localhost, Decap talks to `decap-server` (started by `npm run admin`),
 *    which writes straight into content/ on this machine.
 *  - On the live site it commits to GitHub instead. That needs the repo pushed
 *    to GitHub and CMS_GITHUB_REPO ("owner/name") set at build time, plus a
 *    GitHub OAuth app on the host. Until then the live /admin says so and stops.
 */
import { site } from "@content/site";

const optional = { required: false } as const;

/** Images chosen in Settings are stored as repo paths, e.g. "/content/services/x.jpg". */
const settingsImage = (label: string, folder: string, hint?: string) => ({
  label,
  name: "image",
  widget: "image",
  media_folder: folder,
  public_folder: folder,
  choose_url: false,
  hint,
});

export const githubRepo = process.env.CMS_GITHUB_REPO ?? "";

export const cmsConfig = {
  load_config_file: false,
  local_backend: true,
  backend: { name: "github", repo: githubRepo, branch: process.env.CMS_GITHUB_BRANCH ?? "main" },
  site_url: site.url,
  display_url: site.url,
  logo_url: "/brand/logo-mark-dark.png",
  // Required globally; every collection below overrides it.
  media_folder: "public/uploads",
  public_folder: "/uploads",
  collections: [
    {
      name: "projects",
      label: "Projects",
      label_singular: "Project",
      description:
        "Every project on the site. After saving, the dev site updates within a few seconds; run `npm run build` and deploy to publish.",
      folder: "content/projects",
      path: "{{slug}}/index",
      slug: "{{slug}}",
      extension: "md",
      format: "frontmatter",
      create: true,
      delete: true,
      // Photos are stored next to the project, in content/projects/<slug>/images/.
      media_folder: "images",
      public_folder: "images",
      summary: "{{order}}. {{title}}",
      sortable_fields: ["order", "title"],
      // The preview pane uses public/admin-preview.js: Decap's default draws
      // photos at full size, which reads as zoomed in.
      view_filters: [
        { label: "Architecture", field: "category", pattern: "architecture" },
        { label: "Interior", field: "category", pattern: "interior" },
        { label: "Engineering", field: "category", pattern: "engineering" },
      ],
      fields: [
        { label: "Title", name: "title", widget: "string" },
        {
          label: "Category",
          name: "category",
          widget: "select",
          options: [
            { label: "Architecture", value: "architecture" },
            { label: "Interior", value: "interior" },
            { label: "Engineering", value: "engineering" },
          ],
        },
        {
          label: "Status",
          name: "status",
          widget: "select",
          default: "completed",
          options: [
            { label: "Completed", value: "completed" },
            { label: "In progress", value: "ongoing" },
          ],
        },
        {
          label: "Show on home page",
          name: "featured",
          widget: "boolean",
          default: true,
          hint: "Includes it in 'Selected work' on the home page.",
        },
        {
          label: "Order",
          name: "order",
          widget: "number",
          value_type: "int",
          default: 99,
          hint: "Lower numbers come first. The first project also supplies the home page hero.",
        },
        {
          label: "Main image",
          name: "hero",
          widget: "image",
          choose_url: false,
          hint: "The large image at the top of the project page and on its card.",
        },
        {
          label: "Gallery",
          name: "gallery",
          widget: "list",
          ...optional,
          // Expanded, so each row shows its thumbnail rather than just "Image".
          collapsed: false,
          field: { label: "Image", name: "image", widget: "image", choose_url: false },
          hint: "Drag to reorder. Only the first 5 show (6 with the main image) unless 'Show every image' is on.",
        },
        {
          label: "Show every image",
          name: "allImages",
          widget: "boolean",
          default: false,
          hint: "Turns off the 6-image limit for this project.",
        },
        {
          label: "Location",
          name: "location",
          widget: "string",
          ...optional,
          hint: "e.g. Rajgurunagar, Pune",
        },
        {
          label: "Area (m²)",
          name: "area",
          widget: "number",
          value_type: "int",
          default: 0,
          hint: "Built-up area in square metres. 0 hides it.",
        },
        {
          label: "Year",
          name: "year",
          widget: "number",
          value_type: "int",
          default: 0,
          hint: "Year of completion. 0 hides it.",
        },
        { label: "Client", name: "client", widget: "string", ...optional, default: "Private" },
        {
          label: "Summary",
          name: "summary",
          widget: "text",
          ...optional,
          hint: "One line, used on the project page and in search results.",
        },
        {
          label: "Tags",
          name: "tags",
          widget: "list",
          ...optional,
          hint: "Comma separated, e.g. residential",
        },
        {
          label: "Scope",
          name: "scope",
          widget: "list",
          ...optional,
          hint: "e.g. Architecture, Interior",
        },
        { label: "Photographer", name: "photographer", widget: "string", ...optional },
        { label: "Instagram post link", name: "sourceUrl", widget: "string", ...optional },
        { label: "Description", name: "body", widget: "markdown", ...optional },
      ],
    },
    {
      name: "settings",
      label: "Settings",
      editor: { preview: false },
      files: [
        {
          name: "studio",
          label: "Studio page",
          file: "content/settings/studio.json",
          fields: [
            { label: "Home page intro", name: "intro", widget: "text" },
            { label: "Studio page statement", name: "statement", widget: "text" },
            {
              label: "Founder",
              name: "founder",
              widget: "object",
              fields: [
                { label: "Name", name: "name", widget: "string" },
                { label: "Title", name: "title", widget: "string" },
                {
                  label: "Biography",
                  name: "bio",
                  widget: "text",
                  ...optional,
                  hint: "Empty hides it.",
                },
                {
                  ...settingsImage(
                    "Portrait",
                    "/content/studio",
                    "Empty uses a project photograph instead.",
                  ),
                  name: "portrait",
                  ...optional,
                },
              ],
            },
            {
              label: "Show 'By the numbers'",
              name: "showStats",
              widget: "boolean",
              default: true,
            },
            {
              label: "Numbers",
              name: "stats",
              widget: "list",
              summary: "{{fields.value}}{{fields.suffix}} {{fields.label}}",
              fields: [
                { label: "Number", name: "value", widget: "number", value_type: "int" },
                {
                  label: "After the number",
                  name: "suffix",
                  widget: "string",
                  ...optional,
                  hint: "e.g. +",
                },
                { label: "Label", name: "label", widget: "string" },
              ],
            },
            {
              label: "Credentials",
              name: "credentials",
              widget: "string",
              ...optional,
              hint: "e.g. COA registration number. Empty hides it.",
            },
          ],
        },
        {
          name: "site",
          label: "Contact",
          file: "content/settings/site.json",
          fields: [
            {
              label: "Site description",
              name: "description",
              widget: "text",
              hint: "Used by search engines.",
            },
            {
              label: "Contact",
              name: "contact",
              widget: "object",
              fields: [
                { label: "Email", name: "email", widget: "string" },
                {
                  label: "Phone (for links)",
                  name: "phoneE164",
                  widget: "string",
                  hint: "No spaces, with +91. Used for call and WhatsApp links, e.g. +919657953538",
                },
                { label: "Phone (as shown)", name: "phoneDisplay", widget: "string" },
                {
                  label: "Second phone (as shown)",
                  name: "phoneSecondaryDisplay",
                  widget: "string",
                  ...optional,
                },
                { label: "WhatsApp opening message", name: "whatsappMessage", widget: "string" },
                {
                  label: "Address",
                  name: "address",
                  widget: "object",
                  fields: [
                    { label: "Street", name: "line1", widget: "string" },
                    { label: "City", name: "city", widget: "string" },
                    { label: "State", name: "state", widget: "string" },
                    { label: "PIN code", name: "postalCode", widget: "string" },
                    { label: "Country code", name: "country", widget: "string", default: "IN" },
                  ],
                },
                { label: "Opening hours", name: "hours", widget: "string" },
                {
                  label: "Map search",
                  name: "mapQuery",
                  widget: "string",
                  ...optional,
                  hint: "Text to search on Google Maps for the contact page map. Empty hides the map.",
                },
              ],
            },
            {
              label: "Social",
              name: "socials",
              widget: "object",
              fields: [
                { label: "Instagram link", name: "instagram", widget: "string" },
                { label: "Instagram handle", name: "instagramHandle", widget: "string" },
              ],
            },
          ],
        },
        {
          name: "brand",
          label: "Name & tagline",
          file: "content/brand.json",
          fields: [
            { label: "Practice name", name: "name", widget: "string" },
            { label: "Short name", name: "shortName", widget: "string" },
            { label: "Tagline", name: "tagline", widget: "string" },
            {
              label: "Disciplines line",
              name: "disciplines",
              widget: "string",
              hint: "Shown above the home page headline.",
            },
          ],
        },
        {
          name: "testimonials",
          label: "Client quotes",
          file: "content/settings/testimonials.json",
          fields: [
            { label: "Show on home page", name: "show", widget: "boolean", default: true },
            {
              label: "Quotes",
              name: "items",
              widget: "list",
              summary: "{{fields.quote}}",
              fields: [
                { label: "Quote", name: "quote", widget: "text" },
                {
                  label: "Who",
                  name: "author",
                  widget: "string",
                  hint: "e.g. Client, or a name with permission",
                },
                { label: "Project type", name: "role", widget: "string" },
                { label: "Place", name: "company", widget: "string", ...optional },
              ],
            },
          ],
        },
        {
          name: "reels",
          label: "Reels ('In the detail')",
          file: "content/settings/reels.json",
          fields: [
            { label: "Show on home page", name: "show", widget: "boolean", default: true },
            {
              label: "Reels",
              name: "items",
              widget: "list",
              summary: "{{fields.name}} - {{fields.caption}}",
              hint: "Drag to reorder. New videos are added with scripts/import-reels.mjs.",
              fields: [
                {
                  label: "Video file",
                  name: "name",
                  widget: "string",
                  hint: "File name in public/reels without .mp4, e.g. reel-03",
                },
                { label: "Caption", name: "caption", widget: "string" },
                {
                  label: "Link",
                  name: "href",
                  widget: "string",
                  ...optional,
                  hint: "Optional, e.g. /projects/chand-bungalow",
                },
                { label: "Description for screen readers", name: "alt", widget: "string" },
              ],
            },
          ],
        },
      ],
    },
  ],
};
