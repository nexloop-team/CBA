"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Google Maps embed that is only mounted once it scrolls into view - an iframe
 * loaded on first paint costs several hundred kilobytes and a third-party
 * connection for something most visitors never scroll to.
 */
export default function LazyMap({ query }: { query: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || show) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [show]);

  return (
    <div ref={ref} className="bg-stone/20 aspect-[16/9] w-full overflow-hidden md:aspect-[21/9]">
      {show && (
        <iframe
          title="Studio location"
          src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="size-full border-0 grayscale"
        />
      )}
    </div>
  );
}
