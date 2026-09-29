"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ExternalLink, Eye, X } from "lucide-react";
import type { SiteData } from "@/types/site-data";

/**
 * Live preview for /admin: the real site in a frame beside the form.
 *
 * Text on the site carries `data-edit="<path>"` (e.g. "studio.about.1"). As
 * the editor types, the frame's matching text is replaced with the unsaved
 * value, and focusing a field scrolls the frame to where that text sits and
 * flashes it. Inside the frame the site runs without animations (see
 * inPreviewFrame in src/lib/gsap.ts), so every text is plain and visible.
 */

export const PREVIEW_PAGES = [
  { path: "/", label: "Home" },
  { path: "/studio/", label: "Studio" },
  { path: "/contact/", label: "Contact" },
] as const;

/** Where a piece of text lives when it is not on the page being previewed. */
function pageFor(key: string): string {
  if (/^studio\.(statement|founder|credentials)/.test(key)) return "/studio/";
  if (/^contact\./.test(key)) return "/contact/";
  return "/";
}

/** The text the site would show for a `data-edit` key, given unsaved data. */
function valueFor(key: string, data: SiteData): string | null {
  const c = data.contact;
  if (key === "contact.cityLine")
    return `${c.address.city}, ${c.address.state} ${c.address.postalCode}`;
  if (key === "contact.phones") {
    return c.phoneSecondaryDisplay
      ? `${c.phoneDisplay} / ${c.phoneSecondaryDisplay}`
      : c.phoneDisplay;
  }
  const value = key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined,
      data,
    );
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

type FocusFn = (keys: string | string[]) => void;
const PreviewContext = createContext<FocusFn>(() => {});

export const usePreviewFocus = () => useContext(PreviewContext);

/** Wrap a field so focusing anything inside it shows where it appears on the site. */
export function PreviewTarget({
  keys,
  children,
}: {
  keys: string | string[];
  children: ReactNode;
}) {
  const focus = useContext(PreviewContext);
  return <div onFocus={() => focus(keys)}>{children}</div>;
}

export function PreviewProvider({ focus, children }: { focus: FocusFn; children: ReactNode }) {
  return <PreviewContext.Provider value={focus}>{children}</PreviewContext.Provider>;
}

/** Hook for AdminApp: state and the focus function to hand to PreviewProvider. */
export function usePreview() {
  const [page, setPage] = useState<string>("/");
  const [request, setRequest] = useState<{ keys: string[]; n: number } | null>(null);
  const focus = useCallback<FocusFn>((keys) => {
    setRequest((r) => ({ keys: Array.isArray(keys) ? keys : [keys], n: (r?.n ?? 0) + 1 }));
  }, []);
  return { page, setPage, request, focus };
}

export default function PreviewPane({
  data,
  page,
  setPage,
  request,
}: {
  data: SiteData;
  page: string;
  setPage: (page: string) => void;
  request: { keys: string[]; n: number } | null;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(0);
  const [open, setOpen] = useState(false); // small screens only
  const handled = useRef(0);

  const doc = () => {
    try {
      return frame.current?.contentDocument ?? null;
    } catch {
      return null;
    }
  };

  // Copy unsaved text into the frame whenever it changes or a page loads.
  useEffect(() => {
    const d = doc();
    if (!d) return;
    d.querySelectorAll<HTMLElement>("[data-edit]").forEach((el) => {
      const value = valueFor(el.dataset.edit!, data);
      if (value !== null && el.textContent !== value) el.textContent = value;
    });
  }, [data, loaded]);

  // Show where a focused field's text is, switching page if it lives elsewhere.
  useEffect(() => {
    if (!request || handled.current === request.n) return;
    const d = doc();
    const w = frame.current?.contentWindow;
    if (!d || !w) return;
    // Mid-navigation the frame still holds the previous page; wait for the load.
    if (w.location.pathname !== page || d.readyState !== "complete") return;
    const el = request.keys
      .map((key) => d.querySelector<HTMLElement>(`[data-edit="${key}"]`))
      .find(Boolean);
    if (!el) {
      const target = pageFor(request.keys[0]);
      if (target !== page)
        setPage(target); // retried when the new page loads
      else handled.current = request.n;
      return;
    }
    handled.current = request.n;
    // Scroll only the frame - scrollIntoView would also scroll the admin page.
    const rect = el.getBoundingClientRect();
    w.scrollTo({
      top: w.scrollY + rect.top - w.innerHeight / 2 + rect.height / 2,
      behavior: "smooth",
    });
    el.style.transition = "outline-color .3s";
    el.style.outline = "3px solid #f59e0b";
    el.style.outlineOffset = "6px";
    el.style.borderRadius = "4px";
    window.setTimeout(() => {
      el.style.outlineColor = "transparent";
    }, 1600);
  }, [request, loaded, page, setPage]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-30 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg lg:hidden"
      >
        <Eye className="size-4" /> Preview
      </button>

      <aside
        className={`${open ? "fixed inset-x-0 bottom-0 z-40 h-[75svh] rounded-t-2xl shadow-2xl" : "hidden"} flex-col overflow-hidden border border-slate-200 bg-white lg:sticky lg:top-[7.5rem] lg:z-auto lg:flex lg:h-[calc(100svh-9rem)] lg:rounded-xl lg:shadow-sm`}
      >
        <div className="flex items-center gap-1 border-b border-slate-200 px-3 py-2">
          <span className="mr-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Preview
          </span>
          {PREVIEW_PAGES.map((p) => (
            <button
              key={p.path}
              type="button"
              onClick={() => setPage(p.path)}
              className={`rounded-md px-2.5 py-1 text-sm font-medium ${page === p.path ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {p.label}
            </button>
          ))}
          <a
            href={page}
            target="_blank"
            rel="noreferrer"
            aria-label="Open this page in a new tab"
            className="ml-auto grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <ExternalLink className="size-4" />
          </a>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close preview"
            className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X className="size-4" />
          </button>
        </div>
        <iframe
          ref={frame}
          src={page}
          title="Live preview"
          className="w-full flex-1 bg-white"
          onLoad={() => {
            // Links clicked inside the preview move the page selector along.
            const path = frame.current?.contentWindow?.location.pathname;
            if (path && path !== page) setPage(path);
            setLoaded((n) => n + 1);
          }}
        />
        <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
          Your unsaved text shows here as you type. New or removed items appear after you save.
        </p>
      </aside>
    </>
  );
}
