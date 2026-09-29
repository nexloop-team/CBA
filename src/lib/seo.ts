import type { Site } from "@content/site";

/**
 * Organisation-level structured data. Emitted once, in the root layout.
 * ProfessionalService is the closest schema.org type for an architecture
 * practice that also builds.
 */
export function organisationJsonLd(site: Site) {
  return {
    "@context": "https://schema.org",
    "@type": ["ProfessionalService", "GeneralContractor"],
    "@id": `${site.url}/#organisation`,
    name: site.name,
    description: site.description,
    url: site.url,
    slogan: site.tagline,
    email: site.contact.email,
    telephone: site.contact.phoneE164,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.contact.address.line1,
      addressLocality: site.contact.address.city,
      addressRegion: site.contact.address.state,
      postalCode: site.contact.address.postalCode,
      addressCountry: site.contact.address.country,
    },
    areaServed: { "@type": "State", name: "Maharashtra" },
    knowsAbout: [
      "Architecture",
      "Interior design",
      "Structural engineering",
      "Construction supervision",
    ],
    sameAs: [site.socials.instagram],
  };
}
