"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Link } from "next-view-transitions";
import { MessageCircle } from "lucide-react";
import { telHref, whatsappHref } from "@content/site";
import { useSite } from "@/components/layout/SiteProvider";
import { cn } from "@/lib/utils";

/**
 * Driessen's header: wordmark left, nav right, phone pinned far right.
 *
 * Two states. Past 80px - or with the mobile sheet open - it becomes a
 * translucent bone bar and the type is ink. Before that it is transparent, and
 * on a route whose first screen is a full-bleed photograph it inverts to the
 * light colourway; see the header rules in globals.css, which key off
 * [data-transparent] and the [data-hero] marker on those sections.
 */
export default function Header() {
  const site = useSite();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile sheet whenever the route changes. Adjusting state during
  // render is the documented pattern for this; an effect would cause a second,
  // visible pass with the sheet still open.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  // The mobile sheet is a bone panel, so the bar above it has to be bone too -
  // otherwise the sheet opens under light type sitting on nothing.
  const solid = scrolled || menuOpen;

  // With the sheet open the page behind it must not scroll. overflow:hidden on
  // the body is enough here because Lenis scrolls the window rather than a
  // wrapper element, so there is no second scroller left running underneath.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header
      data-transparent={solid ? undefined : ""}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color,color] duration-500",
        solid ? "border-line bg-bone/80 border-b backdrop-blur-md" : "border-b border-transparent",
      )}
    >
      <div className="container-site flex h-16 items-center justify-between gap-6 md:h-20">
        <Link
          href="/"
          data-tap
          className="inline-flex shrink-0 items-center"
          aria-label={`${site.name} - home`}
        >
          {/* One file for both colourways - globals.css inverts this to white
              while the header is over a hero. */}
          <img
            data-logo
            src="/brand/logo-mark-dark.png"
            alt={site.name}
            width={1600}
            height={957}
            className="h-9 w-auto transition-[filter] duration-500 md:h-10"
          />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-10 md:flex">
          {site.nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-nav-item
                className={cn(
                  "label relative py-1 transition-opacity",
                  active ? "opacity-100" : "opacity-60 hover:opacity-100",
                )}
              >
                {item.label}
                {active && (
                  <span
                    className="bg-accent absolute inset-x-0 -bottom-0.5 h-px"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <a
            href={telHref(site)}
            data-nav-item
            // relative: the coarse-pointer overlay in globals.css positions
            // against this box, and without it the overlay would resolve
            // against the header and cover the whole bar.
            className="label relative hidden opacity-60 transition-opacity hover:opacity-100 lg:block"
          >
            {site.contact.phoneDisplay}
          </a>
          <a
            href={whatsappHref(site)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            data-hairline
            data-tap
            className="border-line grid size-11 place-items-center rounded-full border transition-colors hover:border-current md:size-9"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
          </a>

          {/* -mr-3 pulls the enlarged target back so the label still lines up
              with the container gutter. */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            data-tap
            className="label -mr-3 inline-flex items-center justify-center px-3 md:hidden"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {/*
        Mobile sheet.

        max-h/overflow-y: the sheet hangs off a fixed header, so without a
        bound it can run past the bottom of the screen with no way to reach
        what is down there - which is what happens on a short phone in
        landscape. 4rem is the bar height above it.

        pb uses env(safe-area-inset-bottom) so the last row clears the iOS home
        indicator rather than sitting under it.
      */}
      <div
        id="mobile-nav"
        hidden={!menuOpen}
        className="border-line bg-bone max-h-[calc(100svh-4rem)] overflow-y-auto overscroll-contain border-t px-6 pt-2 md:hidden"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
      >
        <nav aria-label="Primary mobile" className="flex flex-col">
          {site.nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-tap
                className={cn(
                  "display text-display-s border-line flex items-center border-b py-4 transition-opacity",
                  active ? "opacity-100" : "opacity-70",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* The two things someone on a phone is most likely to want, as real
            targets rather than a line of small print. */}
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={whatsappHref(site)}
            target="_blank"
            rel="noopener noreferrer"
            data-tap
            className="label bg-ink text-bone inline-flex items-center justify-center rounded-full px-6"
          >
            Message on WhatsApp
          </a>
          <a
            href={telHref(site)}
            data-tap
            data-numeric
            className="label border-line inline-flex items-center justify-center rounded-full border px-6"
          >
            {site.contact.phoneDisplay}
          </a>
        </div>
      </div>
    </header>
  );
}
