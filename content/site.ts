/**
 * Every real-world detail about the practice.
 *
 * The editable parts (description, contact, socials) live in
 * settings/site.json and brand.json so the /admin editor can change them.
 * Services are in settings/services.json, which the admin does not show.
 * Code-only settings (domain, nav, hero video) stay here.
 */
import brand from "./brand.json";
import settings from "./settings/site.json";
import servicesData from "./settings/services.json";

export interface Service {
  id: string;
  title: string;
  summary: string;
  /** Repo path of the row image, e.g. "/content/services/interior.jpg". */
  image?: string;
}

const contact = settings.contact;

export const site = {
  // Shared with scripts/build-images.mjs, which cannot import TypeScript -
  // brand.json is the single source of truth for both.
  name: brand.name,
  shortName: brand.shortName,
  tagline: brand.tagline,
  disciplines: brand.disciplines,
  description: settings.description,

  // TODO(client): confirm the live domain before deploying - this drives
  // canonical URLs, the sitemap and Open Graph tags.
  url: "https://chetanborkarassociates.com",

  /**
   * Hero media. With `video` null the hero uses the first featured project's
   * photograph. Set it to a path under public/ to play a film instead -
   * landscape, muted, short and small (it is the first thing anyone downloads).
   */
  hero: {
    video: null as string | null,
    poster: null as string | null,
  },

  contact: {
    ...contact,
    /** Optional: appears on the contact page map. Empty hides the map. */
    mapQuery: contact.mapQuery || null,
  },

  socials: settings.socials,

  nav: [
    { label: "Projects", href: "/projects" },
    { label: "Studio", href: "/studio" },
    { label: "Contact", href: "/contact" },
  ],

  /** Drives the service rows on the home page. */
  services: servicesData.services as Service[],
};

export type SiteConfig = typeof site;

/** Pre-filled WhatsApp click-to-chat link. */
export const whatsappHref = `https://wa.me/${site.contact.phoneE164.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
  site.contact.whatsappMessage,
)}`;

/**
 * True while a detail is still the placeholder shipped with the template.
 *
 * Placeholders are omitted from the page rather than rendered, which is the
 * same rule the project content already follows (see isPending in
 * src/lib/content.ts): "TODO Studio address" and "TODO City" printed in a live
 * footer are worse than no address at all, and a half-filled site.ts should not
 * be able to ship them by accident.
 *
 * The all-zeros test is a heuristic for the unfilled phone and postal code. A
 * real number with five zeros in a row would be hidden too, which is a fault
 * that announces itself immediately - unlike the failure it is guarding.
 */
export function isPlaceholder(value: string | null | undefined): boolean {
  return !value || /TODO/i.test(value) || /0{5,}/.test(value);
}

export const telHref = `tel:${site.contact.phoneE164}`;
export const mailHref = `mailto:${site.contact.email}`;
