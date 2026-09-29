import { Link } from "next-view-transitions";
import { mailHref, telHref, isPlaceholder } from "@content/site";
import { getSite } from "@/lib/content";
import InstagramIcon from "@/components/ui/InstagramIcon";

export default async function Footer() {
  const site = await getSite();
  const year = new Date().getFullYear();
  const { address } = site.contact;

  // Unfilled details are left out rather than printed - see isPlaceholder.
  const showEmail = !isPlaceholder(site.contact.email);
  const showPhone = !isPlaceholder(site.contact.phoneDisplay);
  const showAddress = !isPlaceholder(address.line1) && !isPlaceholder(address.city);

  // inline-block + py so each row is a real target on a phone; the negative
  // margin keeps the visual rhythm of the list unchanged.
  const linkClass = "inline-block py-1.5 text-sm opacity-70 transition-opacity hover:opacity-100";

  return (
    <footer className="border-line-inverse bg-ink text-bone border-t">
      <div className="container-site py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-12 md:gap-8 lg:gap-10">
          <div className="md:col-span-4">
            {/* The full horizontal lockup, light colourway - the footer is
                always on ink. It carries the discipline line itself, which is
                why the bottom bar no longer repeats it. */}
            <img
              src="/brand/logo-full-light.png"
              alt={site.name}
              width={1600}
              height={571}
              loading="lazy"
              decoding="async"
              className="h-16 w-auto md:h-20"
            />
            <p className="mt-7 max-w-xs text-sm opacity-60">{site.tagline}</p>
          </div>

          {/*
            A nested three-column grid rather than more 12-column arithmetic.
            At the md breakpoint the outer grid's columns are about 50px wide,
            and fitting three short lists to spans and starts across them is how
            a footer ends up wrapping one word per line. Three equal columns in
            their own grid cannot do that.
          */}
          <div className="grid min-w-0 grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 sm:gap-10 md:col-span-7 md:col-start-6">
            <nav aria-label="Footer" className="min-w-0">
              <h2 className="label opacity-40">Navigate</h2>
              <ul className="mt-4 space-y-0.5">
                <li>
                  <Link href="/" className={linkClass}>
                    Home
                  </Link>
                </li>
                {site.nav.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={linkClass}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="min-w-0">
              <h2 className="label opacity-40">Reach us</h2>
              <ul className="mt-4 space-y-0.5">
                {showEmail && (
                  <li>
                    <a
                      href={mailHref(site)}
                      className={`${linkClass.replace("inline-block", "block")} [overflow-wrap:anywhere]`}
                    >
                      {site.contact.email.split("@")[0]}
                      <wbr />@{site.contact.email.split("@")[1]}
                    </a>
                  </li>
                )}
                {showPhone && (
                  <li>
                    <a href={telHref(site)} data-numeric className={linkClass}>
                      {site.contact.phoneDisplay}
                    </a>
                  </li>
                )}
                <li>
                  <a
                    href={site.socials.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${linkClass.replace("inline-block", "flex")} items-start gap-2`}
                  >
                    <InstagramIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    {/* Zero-width spaces after underscores let a long handle wrap in a narrow column. */}
                    <span className="min-w-0">
                      {site.socials.instagramHandle.replaceAll("_", "_​")}
                    </span>
                  </a>
                </li>
              </ul>
            </div>

            <div className="col-span-2 min-w-0 sm:col-span-1">
              <h2 className="label opacity-40">Studio</h2>
              <div className="mt-5 space-y-4 text-sm opacity-60">
                {showAddress && (
                  <address className="not-italic">
                    {address.line1}
                    <br />
                    {address.city}, {address.state} {address.postalCode}
                  </address>
                )}
                <p>{site.contact.hours}</p>
              </div>
            </div>
          </div>
        </div>

        {/* env() so the last line clears the iOS home indicator rather than
            sitting under it when the site is installed to the home screen. */}
        <div
          className="border-line-inverse mt-14 border-t pt-6 text-xs opacity-40 md:mt-16"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <p>
            © {year} {site.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
