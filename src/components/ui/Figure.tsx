"use client";

import { useRef } from "react";
import { gsap, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import type { ProjectImage } from "@/types/project";
import { cn } from "@/lib/utils";

interface FigureProps {
  image: ProjectImage;
  /** Responsive `sizes`. Get this right - it decides which derivative downloads. */
  sizes?: string;
  className?: string;
  /** Wrapper aspect ratio. Defaults to the image's intrinsic ratio. */
  ratio?: string;
  /**
   * Above-the-fold images only: `eager` + `fetchPriority="high"`.
   * Every high-priority image competes with the LCP candidate, so this should
   * be true for at most one or two images per page.
   */
  priority?: boolean;
  /**
   * Clip-path wipe as the image scrolls in. Independent of `priority` - a
   * decorative image can skip the animation without also being preloaded.
   * Defaults to off when `priority` is set, since a clipped element can delay
   * the LCP measurement.
   */
  reveal?: boolean;
  /** Slow Ken Burns push-in. Used on hero images. */
  push?: boolean;
  alt?: string;
  /**
   * Pairs this image with the identically-named one on the next page so the
   * browser morphs between them during a view transition. Names must be unique
   * per document, so only ever one element per page may carry a given name.
   */
  viewTransitionName?: string;
}

/**
 * Replaces next/image, which `output: 'export'` disables.
 * Serves AVIF, then WebP, then a JPEG fallback.
 *
 * The blur placeholder is a CSS background on the wrapper rather than a second
 * <img>. An extra element would sit underneath the real image - permanently
 * composited, never visible, and impossible to fade out reliably, because
 * React's onLoad does not fire for images already complete at hydration.
 */
export default function Figure({
  image,
  sizes = "100vw",
  className,
  ratio,
  priority = false,
  reveal,
  push = false,
  alt,
  viewTransitionName,
}: FigureProps) {
  const root = useRef<HTMLDivElement>(null);
  const shouldReveal = reveal ?? !priority;

  const srcSet = (ext: "avif" | "webp") =>
    image.widths.map((w) => `${image.stem}-${w}.${ext} ${w}w`).join(", ");

  useGSAP(
    () => {
      const img = root.current?.querySelector("img");

      if (prefersReducedMotion()) {
        gsap.set(root.current, { opacity: 1, y: 0 });
        if (img) gsap.set(img, { scale: 1 });
        return;
      }

      if (push && img) {
        gsap.fromTo(
          img,
          { scale: 1.08 },
          { scale: 1, duration: 2.4, ease: "power2.out", force3D: true },
        );
      }

      if (!shouldReveal) return;

      // A single timeline, so each image costs one ScrollTrigger rather than two.
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 88%", once: true },
        defaults: { ease: EASE.out, force3D: true },
      });

      tl.fromTo(root.current, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.8 }, 0);
      if (img) tl.fromTo(img, { scale: 1.06 }, { scale: 1, duration: 1.1 }, 0);

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    },
    { dependencies: [shouldReveal, push] },
  );

  return (
    <div
      ref={root}
      // Hidden up front only when a reveal will run, so the from-state never
      // paints as a flash. Priority images are never hidden.
      data-reveal={shouldReveal ? "" : undefined}
      className={cn("bg-stone/20 relative overflow-hidden", shouldReveal && "opacity-0", className)}
      style={{
        aspectRatio: ratio ?? `${image.width} / ${image.height}`,
        viewTransitionName,
        backgroundImage: `url("${image.blurDataURL}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <picture>
        <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} />
        <source type="image/webp" srcSet={srcSet("webp")} sizes={sizes} />
        <img
          src={`${image.stem}-${image.fallbackWidth}.jpg`}
          width={image.width}
          height={image.height}
          alt={alt ?? image.alt}
          sizes={sizes}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding={priority ? "sync" : "async"}
          className="absolute inset-0 size-full object-cover"
        />
      </picture>
    </div>
  );
}
