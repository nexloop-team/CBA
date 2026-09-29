import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "next-view-transitions";
import { cn } from "@/lib/utils";

type Variant = "solid" | "outline";
type Tone = "light" | "dark";

/**
 * The large pill call-to-action. One definition rather than the same class
 * string repeated across the contact band, the 404 page and the error boundary.
 *
 * `tone` is the surface it sits on: "dark" means a dark section, so a solid
 * button is light-on-dark.
 */
function pillClass(variant: Variant, tone: Tone, className?: string) {
  return cn(
    "label inline-flex items-center justify-center rounded-full px-7 py-4 transition-colors",
    variant === "solid"
      ? tone === "dark"
        ? "bg-bone text-ink hover:bg-bone/85"
        : "bg-ink text-bone hover:bg-ink/85"
      : tone === "dark"
        ? "border border-line-inverse hover:border-bone"
        : "border border-line hover:border-ink",
    className,
  );
}

export function PillLink({
  href,
  variant = "outline",
  tone = "light",
  external = false,
  className,
  children,
  ...props
}: {
  href: string;
  variant?: Variant;
  tone?: Tone;
  external?: boolean;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const classes = pillClass(variant, tone, className);

  // External and protocol links (mailto:, tel:, wa.me) must not go through the
  // client router.
  if (external || !href.startsWith("/")) {
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={classes}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}

export function PillButton({
  variant = "solid",
  tone = "light",
  className,
  children,
  ...props
}: {
  variant?: Variant;
  tone?: Tone;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={pillClass(variant, tone, className)} {...props}>
      {children}
    </button>
  );
}
