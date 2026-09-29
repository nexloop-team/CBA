import type { Metadata } from "next";
import { MessageCircle, Mail, Phone } from "lucide-react";
import InstagramIcon from "@/components/ui/InstagramIcon";
import SectionIndex from "@/components/ui/SectionIndex";
import RevealText from "@/components/ui/RevealText";
import ContourLines from "@/components/ui/ContourLines";
import LazyMap from "@/components/ui/LazyMap";
import { mailHref, telHref, whatsappHref } from "@content/site";
import { getSite } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    title: "Contact",
    description: `Get in touch with ${site.name} - ${site.contact.address.city}.`,
    alternates: { canonical: "/contact/" },
  };
}

export default async function ContactPage() {
  const site = await getSite();
  const { address } = site.contact;

  // No contact form by design - these are the channels clients actually use,
  // and none of them need a server behind the static site.
  const channels = [
    {
      key: "whatsapp",
      icon: MessageCircle,
      label: "WhatsApp",
      value: "Message us",
      href: whatsappHref(site),
      external: true,
      size: "text-display-m",
      numeric: false,
    },
    {
      key: "email",
      icon: Mail,
      label: "Email",
      value: site.contact.email,
      href: mailHref(site),
      external: false,
      size: "text-display-s",
      numeric: false,
    },
    {
      key: "phone",
      icon: Phone,
      label: "Phone",
      value: `${site.contact.phoneDisplay} / ${site.contact.phoneSecondaryDisplay}`,
      href: telHref(site),
      external: false,
      size: "text-display-s",
      numeric: true,
    },
    {
      key: "instagram",
      icon: InstagramIcon,
      label: "Instagram",
      value: site.socials.instagramHandle,
      href: site.socials.instagram,
      external: true,
      size: "text-display-s",
      numeric: false,
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden pt-28 pb-10 md:pt-40 md:pb-20">
        {/* Runs behind the standfirst and out across the empty right half. */}
        <ContourLines
          className="text-ink/12 absolute inset-x-0 bottom-[-4%] hidden md:block"
          seed={2}
        />

        <div className="container-site relative">
          <SectionIndex index="4.1" label="Contact" />
          <RevealText as="h1" mode="chars" className="display text-display-xl mt-8">
            Contact
          </RevealText>
          <RevealText className="text-lead text-ink/80 mt-10 max-w-xl" delay={0.2}>
            Tell us about the site, the brief and the budget. We will tell you honestly what is
            possible within them.
          </RevealText>
        </div>
      </section>

      <section aria-labelledby="reach-heading" className="pb-14 md:pb-32">
        <div className="container-site grid gap-14 md:grid-cols-12 md:gap-8 lg:gap-10">
          <div className="md:col-span-7">
            <h2 id="reach-heading" className="label text-ink/45">
              Get in touch
            </h2>

            <ul className="mt-8 space-y-8">
              {channels.map((channel) => {
                const Icon = channel.icon;
                return (
                  <li key={channel.key}>
                    <a
                      href={channel.href}
                      {...(channel.external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className="group block"
                    >
                      <span className="label text-ink/45 flex items-center gap-2.5">
                        <Icon className="size-3.5" aria-hidden="true" />
                        {channel.label}
                      </span>
                      <span
                        {...(channel.numeric ? { "data-numeric": true } : {})}
                        className={`display mt-2 block break-words ${channel.size}`}
                      >
                        <span className="link-wipe">{channel.value}</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="md:col-span-4 md:col-start-9">
            <h2 className="label text-ink/45">Studio</h2>
            <address className="text-lead text-ink/80 mt-6 leading-relaxed not-italic">
              {address.line1}
              <br />
              {address.city}, {address.state} {address.postalCode}
            </address>

            <h2 className="label text-ink/45 mt-10">Hours</h2>
            <p className="text-lead text-ink/80 mt-4">{site.contact.hours}</p>
          </div>
        </div>
      </section>

      {site.contact.mapQuery && (
        <section aria-label="Studio location">
          <LazyMap query={site.contact.mapQuery} />
        </section>
      )}
    </>
  );
}
