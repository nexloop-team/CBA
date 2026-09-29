"use client";

import { useEffect } from "react";
import { PillButton, PillLink } from "@/components/ui/PillButton";

/**
 * Route-level error boundary. Unlikely to fire on a static site, but without it
 * a client-side render error blanks the page with no way back.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="container-site flex min-h-svh flex-col justify-center py-32">
      <p className="label text-accent">Something went wrong</p>
      <h1 className="display text-display-m mt-6 max-w-[20ch]">
        This page could not be displayed.
      </h1>
      <p className="text-lead text-ink/65 mt-6 max-w-md">
        Try again, or head back to the projects.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <PillButton onClick={reset}>Try again</PillButton>
        <PillLink href="/projects">All projects</PillLink>
      </div>
    </section>
  );
}
