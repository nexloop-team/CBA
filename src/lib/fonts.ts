import { Manrope, Inter_Tight } from "next/font/google";

/**
 * next/font downloads and self-hosts these at build time - no third-party
 * request at runtime and no layout shift.
 *
 * Substitution note: the plan named Satoshi (Fontshare) for display. Manrope is
 * the closest freely-redistributable equivalent - same geometric neo-grotesque
 * skeleton, and it holds its shape at the 0.35em tracking the section labels use.
 */
export const displayFont = Manrope({
  subsets: ["latin"],
  // No `weight` means the variable font, which is one file covering the whole
  // axis instead of one file per static weight.
  variable: "--font-display-src",
  display: "swap",
});

export const bodyFont = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-body-src",
  display: "swap",
});
