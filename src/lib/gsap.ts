"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Observer } from "gsap/Observer";
import { useGSAP } from "@gsap/react";
import { useSyncExternalStore } from "react";

// registerPlugin is idempotent; guarding on `window` keeps it out of the RSC pass.
if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, Observer);
}

export const EASE = {
  /** Entrances - everything that reveals on scroll. */
  out: "power3.out",
  /** Curtains, preloader, page transitions. */
  curtain: "expo.inOut",
} as const;

export const DUR = {
  reveal: 0.9,
  chars: 0.85,
  curtain: 1.1,
} as const;

/**
 * Single source of truth for the reduced-motion decision. Every animated
 * component checks this and renders its finished state instead of animating.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * Reactive version of `prefersReducedMotion` for components that render
 * differently rather than just animating differently.
 *
 * useSyncExternalStore rather than an effect: the server snapshot is `false`,
 * the client reads the real value on its first render, and a change to the OS
 * setting re-renders without any cascading setState.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

/**
 * Components read the preference once when they mount. If someone changes the
 * OS setting while the page is open, reload so every animation re-evaluates -
 * far simpler, and more reliable, than trying to unwind GSAP timelines and
 * ScrollTrigger pins in place.
 */
export function watchReducedMotion(): () => void {
  if (typeof window === "undefined") return () => {};
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onChange = () => window.location.reload();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export { gsap, ScrollTrigger, SplitText, Observer, useGSAP };
