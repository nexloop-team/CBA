"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { site } from "@content/site";

const SEEN_KEY = "cba:preloaded";

/**
 * Hitoba's `loading` screen: a count to 100 under the wordmark, then a curtain
 * lift.
 *
 * The overlay is rendered on the server so it covers the page from the very
 * first paint - deciding whether to show it during render instead would read
 * sessionStorage on the client only, and the two passes would disagree.
 * Instead it always renders, and the client dismisses it immediately when it
 * has already been seen this session or when reduced motion is requested.
 *
 * Without JavaScript it would never be dismissed at all, so a <noscript> rule
 * in globals.css hides it outright.
 */
export default function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) !== null;
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Private mode or blocked storage - treat as seen and skip the intro.
      seen = true;
    }

    if (seen || prefersReducedMotion()) {
      setDone(true);
      return;
    }

    document.body.style.overflow = "hidden";
    const counter = { value: 0 };
    const countEl = root.current?.querySelector("[data-count]");

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = "";
        setDone(true);
      },
    });

    tl.to(counter, {
      value: 100,
      duration: 0.9,
      ease: "power2.inOut",
      onUpdate: () => {
        if (countEl) countEl.textContent = String(Math.round(counter.value)).padStart(3, "0");
      },
    })
      .to(inner.current, { opacity: 0, duration: 0.3, ease: "power2.in" }, "+=0.05")
      .to(root.current, {
        clipPath: "inset(0% 0% 100% 0%)",
        duration: 0.8,
        ease: EASE.curtain,
      });

    return () => {
      document.body.style.overflow = "";
      tl.kill();
    };
  });

  if (done) return null;

  return (
    <div
      ref={root}
      data-preloader
      aria-hidden="true"
      className="bg-ink text-bone fixed inset-0 z-[100] flex items-end"
    >
      <div ref={inner} className="container-site flex w-full items-baseline justify-between pb-10">
        <span className="label">{site.name}</span>
        <span data-count data-numeric className="display text-display-l">
          000
        </span>
      </div>
    </div>
  );
}
