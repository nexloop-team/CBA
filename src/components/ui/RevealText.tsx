"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, useGSAP, SplitText, EASE, DUR, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

interface RevealTextProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** "chars" is Archidomo's headline treatment; "words" suits body copy. */
  mode?: "chars" | "words" | "lines";
  delay?: number;
  stagger?: number;
  start?: string;
  /** Key the /admin live preview uses to find and update this text. */
  edit?: string;
}

/**
 * Scroll-triggered type reveal. Characters or words translate up from behind a
 * clipping mask - the signature Archidomo move.
 *
 * Under prefers-reduced-motion the text is never split at all: the original
 * markup is left untouched and fully visible, which also keeps it clean for
 * screen readers and for anyone selecting or translating the page.
 */
export default function RevealText({
  children,
  as: Tag = "p",
  className,
  mode = "words",
  delay = 0,
  stagger,
  start = "top 85%",
  edit,
}: RevealTextProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      if (prefersReducedMotion()) {
        gsap.set(el, { opacity: 1 });
        return;
      }

      // autoSplit re-runs onSplit when the web font finishes loading or the
      // width changes. Without it the lines were measured once, in the fallback
      // font, and stayed as hard breaks afterwards ("workplaces and" / "retail").
      const split = SplitText.create(el, {
        type: mode === "chars" ? "chars,words,lines" : mode === "words" ? "words,lines" : "lines",
        mask: "lines",
        linesClass: "overflow-hidden pb-[0.14em] -mb-[0.14em]",
        autoSplit: true,
        onSplit(self) {
          const targets =
            mode === "chars" ? self.chars : mode === "words" ? self.words : self.lines;
          gsap.set(el, { opacity: 1 });
          return gsap.from(targets, {
            yPercent: 108,
            duration: mode === "chars" ? DUR.chars : DUR.reveal,
            ease: EASE.out,
            delay,
            stagger: stagger ?? (mode === "chars" ? 0.018 : 0.045),
            scrollTrigger: { trigger: el, start, once: true },
          });
        },
      });

      return () => split.revert();
    },
    { dependencies: [mode] },
  );

  return (
    // Starts hidden so it cannot be painted and then hidden again by GSAP's
    // from-state - that flash was visible as images appearing and vanishing.
    // The <noscript> rule in the root layout restores it when JS is off.
    <Tag ref={ref} data-reveal data-edit={edit} className={cn("opacity-0", className)}>
      {children}
    </Tag>
  );
}
