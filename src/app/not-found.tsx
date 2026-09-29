import { PillLink } from "@/components/ui/PillButton";
import ContourLines from "@/components/ui/ContourLines";
import SiteShell from "@/components/layout/SiteShell";

/** Lives at the app root so it catches every unknown URL, so it adds the site chrome itself. */
export default function NotFound() {
  return (
    <SiteShell>
      <section className="relative flex min-h-svh flex-col justify-center overflow-hidden py-32">
        {/* The emptiest page on the site, so the lines carry most of it. */}
        <ContourLines
          className="text-ink/12 absolute inset-x-0 top-1/2 -translate-y-1/2"
          seed={11}
          count={13}
          spacing={30}
        />

        <div className="container-site relative">
          <p data-numeric className="display text-display-xl text-accent">
            404
          </p>
          <h1 className="display text-display-m mt-6 max-w-[20ch]">
            This page has not been built.
          </h1>
          <p className="text-lead text-ink/65 mt-6 max-w-md">
            The link may be out of date, or the page may have moved.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <PillLink href="/" variant="solid">
              Home
            </PillLink>
            <PillLink href="/projects">All projects</PillLink>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
