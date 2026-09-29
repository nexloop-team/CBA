import type { ReactNode } from "react";
import { getSite } from "@/lib/content";
import { organisationJsonLd } from "@/lib/seo";
import SmoothScroll from "@/components/layout/SmoothScroll";
import Preloader from "@/components/layout/Preloader";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

/**
 * Everything around a public page: header, footer, smooth scrolling and the
 * preloader. Used by the (site) layout and the 404 page; /admin has none of it.
 */
export default async function SiteShell({ children }: { children: ReactNode }) {
  const site = await getSite();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd(site)) }}
      />
      <a
        href="#main"
        className="label focus:bg-ink focus:text-bone sr-only focus:not-sr-only focus:fixed focus:top-6 focus:left-6 focus:z-[200] focus:px-4 focus:py-3"
      >
        Skip to content
      </a>
      <Preloader />
      <SmoothScroll />
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
