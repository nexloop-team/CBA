/**
 * The practice's details, as components use them.
 *
 * The editable parts (name, tagline, description, contact, socials) come from
 * the /admin data document - see src/lib/site-data.ts. Server code gets the
 * result from `getSite()` in src/lib/content.ts; client components from
 * `useSite()`. The code-only settings (domain, nav, hero video, services) stay
 * here.
 */
import servicesData from "./settings/services.json";
import type { SiteData } from "@/types/site-data";

export interface Service {
  id: string;
  title: string;
  summary: string;
  /** Repo path of the row image, e.g. "/content/services/interior.jpg". */
  image?: string;
}

// TODO(client): confirm the live domain before launch - this drives canonical
// URLs, the sitemap and Open Graph tags.
export const SITE_URL = "https://chetanborkarassociates.com";

const NAV = [
  { label: "Projects", href: "/projects" },
  { label: "Studio", href: "/studio" },
  { label: "Contact", href: "/contact" },
];

export function buildSite(data: SiteData) {
  return {
    name: data.brand.name,
    shortName: data.brand.shortName,
    tagline: data.brand.tagline,
    disciplines: data.brand.disciplines,
    description: data.description,
    url: SITE_URL,
    /**
     * Hero media. With `video` null the hero uses the first featured project's
     * photograph. Set it to a path under public/ to play a film instead.
     */
    hero: {
      video: null as string | null,
      poster: null as string | null,
    },
    contact: {
      ...data.contact,
      /** Empty hides the contact page map. */
      mapQuery: data.contact.mapQuery || null,
    },
    socials: data.socials,
    nav: NAV,
    services: servicesData.services as Service[],
  };
}

export type Site = ReturnType<typeof buildSite>;

/** Pre-filled WhatsApp click-to-chat link. */
export const whatsappHref = (site: Site) =>
  `https://wa.me/${site.contact.phoneE164.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
    site.contact.whatsappMessage,
  )}`;

export const telHref = (site: Site) => `tel:${site.contact.phoneE164}`;
export const mailHref = (site: Site) => `mailto:${site.contact.email}`;

/**
 * True while a detail is still empty or a template placeholder, so it is
 * omitted from the page rather than rendered.
 */
export function isPlaceholder(value: string | null | undefined): boolean {
  return !value || /TODO/i.test(value) || /0{5,}/.test(value);
}
