import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

/**
 * The circular icon control used by every carousel, rail and overlay.
 *
 * Extracted because the same twelve-class string was pasted into five
 * components; changing the size or hover treatment meant finding all of them,
 * and they had already started to drift apart.
 *
 * `tone` follows the surface it sits on, not the icon colour.
 */
export default function IconButton({
  tone = "light",
  className,
  ref,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "light" | "dark";
  /** React 19 passes ref as an ordinary prop - the lightbox needs it to
      move focus into the dialog. */
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full border transition-colors",
        "disabled:pointer-events-none disabled:opacity-30",
        tone === "dark" ? "border-line-inverse hover:border-bone" : "border-line hover:border-ink",
        className,
      )}
    />
  );
}
