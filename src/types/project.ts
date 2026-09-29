export const CATEGORIES = ["architecture", "interior", "engineering"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  architecture: "Architecture",
  interior: "Interior",
  engineering: "Engineering",
};

export type ProjectStatus = "completed" | "ongoing";

/** One processed image plus everything needed to render it without layout shift. */
export interface ProjectImage {
  /** Path relative to the project's images/ folder, e.g. "01-hero.jpg". */
  src: string;
  width: number;
  height: number;
  /** Inline base64 LQIP shown until the real image decodes. */
  blurDataURL: string;
  /** Mean luminance 0-255, used to size overlay scrims. */
  brightness: number;
  /** Generated derivative widths, smallest first. */
  widths: number[];
  /** Width of the JPEG fallback (the largest generated width). */
  fallbackWidth: number;
  /** Public URL stem, e.g. "/media/villa-aarohi/01-hero" - suffixed per format/width. */
  stem: string;
  alt: string;
}

export interface ProjectFrontmatter {
  title: string;
  category: Category;
  tags: string[];
  location: string;
  /** Square metres. Rendered as m² and sq ft. */
  area: number;
  year: number;
  status: ProjectStatus;
  client?: string;
  scope: string[];
  featured: boolean;
  order: number;
  /** Filename within images/, e.g. "01-hero.jpg". */
  hero: string;
  summary: string;
  /** Provenance back to the original Instagram post, when ingested. */
  sourceUrl?: string;
  /** Credit line, when photography was commissioned. */
  photographer?: string;
}

export interface Project extends ProjectFrontmatter {
  slug: string;
  /**
   * Frontmatter fields still holding a placeholder (`area: 0`, `location:
   * "TODO"`). These are omitted from the page rather than rendered as
   * "0 m²", and the build prints a summary of what is outstanding.
   */
  pending: string[];
  /** Raw MDX body. */
  body: string;
  heroImage: ProjectImage;
  /** All images in the folder, hero first. */
  images: ProjectImage[];
}

/** A project without its body text or full gallery - what list views need. */
export type ProjectSummary = Omit<Project, "body" | "images">;
