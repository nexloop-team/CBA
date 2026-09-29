"use client";

import { useCallback, useEffect, useRef } from "react";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import type { ProjectImage } from "@/types/project";
import { pad2 } from "@/lib/utils";

/**
 * Minimal gallery overlay - no library, so it matches the rest of the site and
 * adds nothing to the bundle.
 *
 * Accessibility: rendered as a modal dialog, focus is trapped inside it while
 * open, Escape closes, and focus returns to whatever opened it.
 */
export default function Lightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: ProjectImage[];
  index: number | null;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const open = index !== null;

  const next = useCallback(
    () => open && onNavigate((index + 1) % images.length),
    [open, index, images.length, onNavigate],
  );
  const prev = useCallback(
    () => open && onNavigate((index - 1 + images.length) % images.length),
    [open, index, images.length, onNavigate],
  );

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") return onClose();
      if (event.key === "ArrowRight") return next();
      if (event.key === "ArrowLeft") return prev();
      if (event.key !== "Tab") return;

      // Focus trap.
      const focusable = root.current?.querySelectorAll<HTMLElement>("button");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreTo.current?.focus();
    };
  }, [open, onClose, next, prev]);

  useGSAP(
    () => {
      if (!open || prefersReducedMotion()) return;
      gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
      gsap.fromTo(
        root.current?.querySelector("[data-lightbox-image]") ?? null,
        { scale: 0.96, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "power3.out" },
      );
    },
    { dependencies: [open, index] },
  );

  // Swipe. On a phone the arrow buttons were the only way through a gallery,
  // which is not how anyone holding a phone expects to move between photos.
  // Plain pointer events rather than a gesture library - this is two numbers.
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (event: React.PointerEvent) => {
    swipe.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    // Horizontal intent only, and far enough that a tap on a button cannot
    // register as a swipe.
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) next();
    else prev();
  };

  if (!open) return null;
  const image = images[index];

  return (
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={`Image ${index + 1} of ${images.length}`}
      className="bg-ink/97 fixed inset-0 z-[120] flex flex-col backdrop-blur-sm"
    >
      <div
        className="text-bone flex items-center justify-between px-6 py-5 md:px-10"
        style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
      >
        <p data-numeric className="label text-bone/65">
          {pad2(index + 1)}
          <span className="mx-1.5 opacity-40">/</span>
          {pad2(images.length)}
        </p>
        <IconButton ref={closeRef} tone="dark" onClick={onClose} aria-label="Close gallery">
          <X className="size-4" aria-hidden="true" />
        </IconButton>
      </div>

      {/* touch-pan-y: without it the browser can claim the horizontal drag for
          its own back-gesture and the swipe never arrives. */}
      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
        className="flex min-h-0 flex-1 touch-pan-y items-center justify-center px-6 pb-4 select-none md:px-10"
      >
        <picture key={image.stem}>
          <source
            type="image/avif"
            srcSet={image.widths.map((w) => `${image.stem}-${w}.avif ${w}w`).join(", ")}
            sizes="92vw"
          />
          <source
            type="image/webp"
            srcSet={image.widths.map((w) => `${image.stem}-${w}.webp ${w}w`).join(", ")}
            sizes="92vw"
          />
          <img
            data-lightbox-image
            src={`${image.stem}-${image.fallbackWidth}.jpg`}
            sizes="92vw"
            alt={image.alt}
            className="max-h-full max-w-full object-contain"
          />
        </picture>
      </div>

      <div
        className="text-bone flex items-center justify-center gap-3 px-6 py-6 md:px-10"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <IconButton tone="dark" onClick={prev} aria-label="Previous image">
          <ArrowLeft className="size-4" aria-hidden="true" />
        </IconButton>
        <IconButton tone="dark" onClick={next} aria-label="Next image">
          <ArrowRight className="size-4" aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}
