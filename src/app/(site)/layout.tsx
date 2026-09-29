import SiteShell from "@/components/layout/SiteShell";

/** The public site. A route group, so it adds nothing to the URLs. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
