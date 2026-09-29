/** Join class names, dropping falsy values. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** 1 -> "01", 12 -> "12". Used by every counter on the site. */
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** 320 -> "3,444" sq ft. Areas are authored in m², shown in both. */
export function sqm2sqft(sqm: number): number {
  return Math.round(sqm * 10.7639);
}

export function formatArea(sqm: number): string {
  return `${sqm.toLocaleString("en-IN")} m²`;
}

export function formatAreaLong(sqm: number): string {
  return `${sqm.toLocaleString("en-IN")} m² / ${sqm2sqft(sqm).toLocaleString("en-IN")} sq ft`;
}

/**
 * Overlay gradient for text sitting on a photograph, scaled to how bright the
 * photograph actually is. A dark night exterior under a heavy scrim just looks
 * muddy; a bright interior under a light one loses the text.
 *
 * `brightness` is mean luminance 0-255, measured at build time.
 */
export function scrimClass(brightness: number): string {
  if (brightness < 95) return "bg-gradient-to-t from-ink/70 via-ink/10 to-transparent";
  if (brightness < 150) return "bg-gradient-to-t from-ink/80 via-ink/25 to-ink/10";
  return "bg-gradient-to-t from-ink/85 via-ink/45 to-ink/25";
}

/**
 * The flat base wash under the contact band's gradient.
 *
 * `scrimClass` is bottom-weighted, which is right for a title sitting at the
 * foot of a hero. The contact band is different: a heading, a paragraph, three
 * buttons and a link run down the whole left side, so the darkening has to be
 * horizontal, and it needs a uniform floor underneath it or a bright patch in
 * the photograph can still surface through the middle of a paragraph.
 *
 * One flat wash on its own was what made the band look wrong - at a single
 * opacity over a bright photograph it reads as a grey fault rather than a
 * treatment. This is the floor; the component lays the horizontal gradient
 * over it.
 */
export function bandScrimClass(brightness: number): string {
  if (brightness < 95) return "bg-ink/20";
  if (brightness < 150) return "bg-ink/35";
  return "bg-ink/50";
}
