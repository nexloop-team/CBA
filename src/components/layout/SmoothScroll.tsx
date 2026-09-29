"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger, prefersReducedMotion, watchReducedMotion } from "@/lib/gsap";

/**
 * Eased scrolling, driven off GSAP's ticker so ScrollTrigger and Lenis never
 * disagree about the scroll position (the usual cause of jittery pinning).
 *
 * Under prefers-reduced-motion Lenis is never instantiated at all - native
 * scroll takes over and nothing else on the page needs to know.
 */
export default function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => watchReducedMotion(), []);

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      // lerp, not duration: duration mode eases every wheel event over a fixed
      // window, which feels like the page trailing the input. lerp converges
      // per frame and stays responsive.
      lerp: 0.11,
      smoothWheel: true,
      // Native momentum on touch beats an emulated one.
      syncTouch: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);

  // Static export keeps the DOM between routes, so reset scroll on navigation
  // and let ScrollTrigger re-measure the new page.
  //
  // Skipped on the first run: on initial load the browser may legitimately be
  // restoring a scroll position or jumping to a hash, and clobbering that is a
  // bug rather than a feature.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      ScrollTrigger.refresh();
      return;
    }
    window.scrollTo(0, 0);
    ScrollTrigger.refresh();
  }, [pathname]);

  return null;
}
