import type { Category, ProjectImage, ProjectStatus } from "@/types/project";

/**
 * Everything the /admin editor can change, stored as one JSON document in
 * Vercel Blob (see src/lib/site-data.ts). Safe to import from client code.
 */

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company?: string;
}

export interface Reel {
  /** Filename stem under public/reels - no extension. */
  name: string;
  caption: string;
  href?: string;
  alt: string;
}

export interface ProjectRecord {
  /** URL segment: /projects/<slug>. Fixed once the project is created. */
  slug: string;
  title: string;
  category: Category;
  status: ProjectStatus;
  /** Shown in "Selected work" on the home page. */
  featured: boolean;
  /** Lower comes first. */
  order: number;
  location: string;
  /** Square metres; 0 hides it. */
  area: number;
  /** 0 hides it. */
  year: number;
  client: string;
  summary: string;
  /** Plain text; blank lines separate paragraphs. */
  description: string;
  tags: string[];
  scope: string[];
  photographer?: string;
  sourceUrl?: string;
  /** Lifts the 6-image limit for this project. */
  allImages: boolean;
  /** The first image is the main image. */
  images: ProjectImage[];
  updatedAt: string;
}

export interface SiteData {
  /** Bumped when the shape changes, so a stale cached copy is never misread. */
  schema: 1;
  updatedAt: string;
  brand: {
    name: string;
    shortName: string;
    tagline: string;
    disciplines: string;
  };
  description: string;
  contact: {
    email: string;
    /** E.164, for tel: and wa.me links, e.g. +919657953538. */
    phoneE164: string;
    phoneDisplay: string;
    phoneSecondaryDisplay: string;
    whatsappMessage: string;
    address: {
      line1: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    hours: string;
    mapQuery: string;
  };
  socials: {
    instagram: string;
    instagramHandle: string;
  };
  studio: {
    intro: string;
    statement: string;
    about: string[];
    founder: {
      name: string;
      title: string;
      bio: string;
      portrait: ProjectImage | null;
    };
    credentials: string;
    showStats: boolean;
    stats: { value: number; suffix: string; label: string }[];
  };
  testimonials: { show: boolean; items: Testimonial[] };
  reels: { show: boolean; items: Reel[] };
  projects: ProjectRecord[];
}
