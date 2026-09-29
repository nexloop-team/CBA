"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, EASE, DUR, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Generic "rise into place" for non-text blocks - cards, metadata rows, rules.
 * `stagger` applies to direct children when `childrenStagger` is set.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  y = 32,
  childrenStagger = false,
  start = "top 88%",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  childrenStagger?: boolean;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, y: 0 });
      if (childrenStagger) gsap.set(el.children, { opacity: 1, y: 0 });
      return;
    }

    const targets = childrenStagger ? Array.from(el.children) : el;
    gsap.set(el, { opacity: 1 });

    gsap.from(targets, {
      y,
      opacity: 0,
      duration: DUR.reveal,
      ease: EASE.out,
      delay,
      stagger: childrenStagger ? 0.08 : 0,
      scrollTrigger: { trigger: el, start, once: true },
    });
  });

  return (
    <div ref={ref} data-reveal className={cn("opacity-0", className)}>
      {children}
    </div>
  );
}
