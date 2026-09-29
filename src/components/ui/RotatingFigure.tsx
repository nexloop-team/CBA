"use client";

import { useEffect, useState } from "react";
import Figure from "@/components/ui/Figure";
import { useReducedMotion } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { ProjectImage } from "@/types/project";

/**
 * A photograph that cycles through several images.
 *
 * Every frame is rendered and stacked, with only opacity animating - that is
 * compositor-only, so the crossfade costs nothing, and it avoids a pop while a
 * newly mounted image decodes.
 *
 * The order is fixed server-side rather than shuffled. Randomising during
 * render would differ between the server and the client and break hydration;
 * the rotation is what makes it feel varied.
 *
 * Pauses on hover so an image can be looked at, and does not rotate at all
 * under prefers-reduced-motion.
 */
export default function RotatingFigure({
  images,
  intervalMs = 4200,
  className,
  frameClassName,
  ratio = "4 / 3",
  sizes = "(min-width: 768px) 26vw, 60vw",
}: {
  images: ProjectImage[];
  intervalMs?: number;
  className?: string;
  /**
   * Applied to the image box only. Lets the frame be offset or overlapped
   * independently of whatever else sits in the container.
   */
  frameClassName?: string;
  ratio?: string;
  sizes?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || paused || images.length < 2) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % images.length), intervalMs);
    return () => window.clearTimeout(id);
  }, [index, paused, reduced, images.length, intervalMs]);

  if (images.length === 0) return null;

  return (
    <div
      className={cn(className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className={cn("relative", frameClassName)} style={{ aspectRatio: ratio }}>
        {images.map((image, i) => (
          <div
            key={image.stem}
            aria-hidden={i !== index}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-[var(--ease-out-soft)]",
              i === index ? "opacity-100" : "opacity-0",
            )}
          >
            <Figure
              image={image}
              ratio={ratio}
              sizes={sizes}
              // Only the first frame animates in; the rest are crossfaded, and a
              // reveal on a hidden layer would fire at the wrong moment.
              reveal={i === 0}
              className="size-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
