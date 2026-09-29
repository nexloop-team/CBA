"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";

/**
 * Odometer count-up for the numbers band. Under reduced motion the final value
 * is simply rendered - it is a fact, not a flourish, so it must still be there.
 *
 * Deliberately an IntersectionObserver rather than a ScrollTrigger. All this
 * needs is "fire once when visible", which is exactly what the observer does
 * natively - no element measurement, and no entry in ScrollTrigger's global
 * `_triggers` array, so these four counters neither take part in nor provoke a
 * refresh cascade.
 *
 * That also sidesteps a crash. ScrollTrigger 3.15 reads `_triggers[i].end`
 * unguarded while refreshing (the matching loop just below it in the same
 * function writes `_triggers[i] || {}`), and `_triggers` is live: anything
 * killed mid-refresh shifts the indices and leaves that read looking at
 * undefined. Creating four triggers synchronously in a layout effect - which is
 * what every hot reload and every StrictMode double-mount does here - lands in
 * that window often enough to throw to the error boundary.
 */
export default function Counter({
  to,
  suffix = "",
  prefix = "",
  duration = 1.8,
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const format = (n: number) => `${prefix}${Math.round(n).toLocaleString("en-IN")}${suffix}`;

      if (prefersReducedMotion()) {
        el.textContent = format(to);
        return;
      }

      // The element server-renders its final value so the number is correct in
      // the static HTML and without JS. Reset it to zero as soon as JS takes
      // over, otherwise the reader sees the real figure and then watches it
      // snap back to 0 when the count-up starts.
      const state = { value: 0 };
      el.textContent = format(0);

      let tween: gsap.core.Tween | undefined;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          tween = gsap.to(state, {
            value: to,
            duration,
            ease: "power2.out",
            onUpdate: () => {
              el.textContent = format(state.value);
            },
          });
        },
        // Matches the old "top 90%" start: begin once it is a little way in.
        { rootMargin: "0px 0px -10% 0px" },
      );
      observer.observe(el);

      return () => {
        observer.disconnect();
        tween?.kill();
      };
    },
    { dependencies: [to] },
  );

  return (
    <span ref={ref} data-numeric className={cn(className)}>
      {/* Server-rendered final value - correct in the static HTML and without JS. */}
      {`${prefix}${to.toLocaleString("en-IN")}${suffix}`}
    </span>
  );
}
