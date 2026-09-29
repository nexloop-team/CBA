"use client";

import { Plus } from "lucide-react";
import type { SiteData } from "@/types/site-data";
import { SingleImageField } from "./ImageFields";
import {
  Button,
  Card,
  Field,
  NumberInput,
  RowControls,
  TextArea,
  TextInput,
  Toggle,
  move,
} from "./ui";

type Update = (change: (data: SiteData) => SiteData) => void;

/** Studio page and the home page's studio intro. */
export function StudioPanel({ data, update }: { data: SiteData; update: Update }) {
  const studio = data.studio;
  const set = (patch: Partial<SiteData["studio"]>) =>
    update((d) => ({ ...d, studio: { ...d.studio, ...patch } }));
  // Functional, because a portrait upload finishes later and must not undo
  // edits made to the other founder fields in the meantime.
  const setFounder = (patch: Partial<SiteData["studio"]["founder"]>) =>
    update((d) => ({ ...d, studio: { ...d.studio, founder: { ...d.studio.founder, ...patch } } }));

  return (
    <div className="space-y-5">
      <Card title="Text">
        <Field label="Home page intro" hint="The large paragraph under the hero on the home page.">
          <TextArea rows={3} value={studio.intro} onChange={(intro) => set({ intro })} />
        </Field>
        <Field label="Studio page statement" hint="The large opening line on the Studio page.">
          <TextArea
            rows={3}
            value={studio.statement}
            onChange={(statement) => set({ statement })}
          />
        </Field>
      </Card>

      <Card title="About paragraphs" hint="Shown on the home page and the Studio page.">
        {studio.about.map((paragraph, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">
              <TextArea
                rows={3}
                value={paragraph}
                onChange={(text) =>
                  set({ about: studio.about.map((p, j) => (j === i ? text : p)) })
                }
              />
            </div>
            <RowControls
              index={i}
              count={studio.about.length}
              onMove={(from, to) => set({ about: move(studio.about, from, to) })}
              onRemove={() => set({ about: studio.about.filter((_, j) => j !== i) })}
            />
          </div>
        ))}
        <Button onClick={() => set({ about: [...studio.about, ""] })}>
          <Plus className="size-4" /> Add paragraph
        </Button>
      </Card>

      <Card title="Founder">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name">
            <TextInput value={studio.founder.name} onChange={(name) => setFounder({ name })} />
          </Field>
          <Field label="Title">
            <TextInput value={studio.founder.title} onChange={(title) => setFounder({ title })} />
          </Field>
        </div>
        <Field label="Biography" hint="Empty hides it.">
          <TextArea rows={5} value={studio.founder.bio} onChange={(bio) => setFounder({ bio })} />
        </Field>
        <Field label="Portrait" hint="Without one, a project photograph is shown.">
          <SingleImageField
            image={studio.founder.portrait}
            onChange={(portrait) => setFounder({ portrait })}
            folder="studio"
            alt={studio.founder.name}
          />
        </Field>
        <Field label="Credentials" hint="e.g. COA registration number. Empty hides it.">
          <TextInput value={studio.credentials} onChange={(credentials) => set({ credentials })} />
        </Field>
      </Card>

      <Card title="By the numbers">
        <Toggle
          checked={studio.showStats}
          onChange={(showStats) => set({ showStats })}
          label="Show this section on the home page"
        />
        {studio.stats.map((stat, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="grid flex-1 grid-cols-[1fr_5rem] gap-2 sm:grid-cols-[8rem_5rem_1fr]">
              <Field label="Number">
                <NumberInput
                  value={stat.value}
                  onChange={(value) =>
                    set({ stats: studio.stats.map((s, j) => (j === i ? { ...s, value } : s)) })
                  }
                />
              </Field>
              <Field label="After it">
                <TextInput
                  value={stat.suffix}
                  placeholder="+"
                  onChange={(suffix) =>
                    set({ stats: studio.stats.map((s, j) => (j === i ? { ...s, suffix } : s)) })
                  }
                />
              </Field>
              <div className="col-span-2 sm:col-span-1">
                <Field label="Label">
                  <TextInput
                    value={stat.label}
                    onChange={(label) =>
                      set({ stats: studio.stats.map((s, j) => (j === i ? { ...s, label } : s)) })
                    }
                  />
                </Field>
              </div>
            </div>
            <RowControls
              index={i}
              count={studio.stats.length}
              onMove={(from, to) => set({ stats: move(studio.stats, from, to) })}
              onRemove={() => set({ stats: studio.stats.filter((_, j) => j !== i) })}
            />
          </div>
        ))}
        <Button
          onClick={() => set({ stats: [...studio.stats, { value: 0, suffix: "", label: "" }] })}
        >
          <Plus className="size-4" /> Add number
        </Button>
      </Card>
    </div>
  );
}

/** Contact details, social links and the practice's name. */
export function ContactPanel({ data, update }: { data: SiteData; update: Update }) {
  const c = data.contact;
  const setContact = (patch: Partial<SiteData["contact"]>) =>
    update((d) => ({ ...d, contact: { ...d.contact, ...patch } }));
  const setAddress = (patch: Partial<SiteData["contact"]["address"]>) =>
    update((d) => ({
      ...d,
      contact: { ...d.contact, address: { ...d.contact.address, ...patch } },
    }));
  const setBrand = (patch: Partial<SiteData["brand"]>) =>
    update((d) => ({ ...d, brand: { ...d.brand, ...patch } }));

  return (
    <div className="space-y-5">
      <Card title="Contact">
        <Field label="Email">
          <TextInput type="email" value={c.email} onChange={(email) => setContact({ email })} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone (as shown)" hint="e.g. +91 96579 53538">
            <TextInput
              value={c.phoneDisplay}
              onChange={(phoneDisplay) => setContact({ phoneDisplay })}
            />
          </Field>
          <Field
            label="Phone for call & WhatsApp links"
            hint="With +91 and no spaces, e.g. +919657953538"
          >
            <TextInput value={c.phoneE164} onChange={(phoneE164) => setContact({ phoneE164 })} />
          </Field>
          <Field label="Second phone (as shown)" hint="Optional.">
            <TextInput
              value={c.phoneSecondaryDisplay}
              onChange={(phoneSecondaryDisplay) => setContact({ phoneSecondaryDisplay })}
            />
          </Field>
          <Field label="WhatsApp opening message">
            <TextInput
              value={c.whatsappMessage}
              onChange={(whatsappMessage) => setContact({ whatsappMessage })}
            />
          </Field>
        </div>
        <Field label="Opening hours">
          <TextInput value={c.hours} onChange={(hours) => setContact({ hours })} />
        </Field>
      </Card>

      <Card title="Studio address">
        <Field label="Street">
          <TextInput value={c.address.line1} onChange={(line1) => setAddress({ line1 })} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="City">
            <TextInput value={c.address.city} onChange={(city) => setAddress({ city })} />
          </Field>
          <Field label="State">
            <TextInput value={c.address.state} onChange={(state) => setAddress({ state })} />
          </Field>
          <Field label="PIN code">
            <TextInput
              value={c.address.postalCode}
              onChange={(postalCode) => setAddress({ postalCode })}
            />
          </Field>
        </div>
        <Field
          label="Map search"
          hint="What to look up on Google Maps for the contact page map. Empty hides the map."
        >
          <TextInput value={c.mapQuery} onChange={(mapQuery) => setContact({ mapQuery })} />
        </Field>
      </Card>

      <Card title="Instagram">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Profile link">
            <TextInput
              value={data.socials.instagram}
              onChange={(instagram) =>
                update((d) => ({ ...d, socials: { ...d.socials, instagram } }))
              }
            />
          </Field>
          <Field label="Handle">
            <TextInput
              value={data.socials.instagramHandle}
              onChange={(instagramHandle) =>
                update((d) => ({ ...d, socials: { ...d.socials, instagramHandle } }))
              }
            />
          </Field>
        </div>
      </Card>

      <Card title="Name & tagline">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Practice name">
            <TextInput value={data.brand.name} onChange={(name) => setBrand({ name })} />
          </Field>
          <Field label="Tagline">
            <TextInput value={data.brand.tagline} onChange={(tagline) => setBrand({ tagline })} />
          </Field>
        </div>
        <Field label="Disciplines line" hint="Shown above the home page headline.">
          <TextInput
            value={data.brand.disciplines}
            onChange={(disciplines) => setBrand({ disciplines })}
          />
        </Field>
        <Field label="Site description" hint="Used by Google and link previews.">
          <TextArea
            rows={3}
            value={data.description}
            onChange={(description) => update((d) => ({ ...d, description }))}
          />
        </Field>
      </Card>
    </div>
  );
}

/** Client quotes and reels on the home page. */
export function HomePanel({ data, update }: { data: SiteData; update: Update }) {
  const t = data.testimonials;
  const r = data.reels;
  const setT = (patch: Partial<SiteData["testimonials"]>) =>
    update((d) => ({ ...d, testimonials: { ...d.testimonials, ...patch } }));
  const setR = (patch: Partial<SiteData["reels"]>) =>
    update((d) => ({ ...d, reels: { ...d.reels, ...patch } }));

  return (
    <div className="space-y-5">
      <Card title="Client quotes">
        <Toggle
          checked={t.show}
          onChange={(show) => setT({ show })}
          label="Show client quotes on the home page"
        />
        {t.items.map((item, i) => (
          <div key={i} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-3">
                <Field label="Quote">
                  <TextArea
                    rows={3}
                    value={item.quote}
                    onChange={(quote) =>
                      setT({ items: t.items.map((x, j) => (j === i ? { ...x, quote } : x)) })
                    }
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Who">
                    <TextInput
                      value={item.author}
                      onChange={(author) =>
                        setT({ items: t.items.map((x, j) => (j === i ? { ...x, author } : x)) })
                      }
                    />
                  </Field>
                  <Field label="Project type">
                    <TextInput
                      value={item.role}
                      onChange={(role) =>
                        setT({ items: t.items.map((x, j) => (j === i ? { ...x, role } : x)) })
                      }
                    />
                  </Field>
                  <Field label="Place">
                    <TextInput
                      value={item.company ?? ""}
                      onChange={(company) =>
                        setT({ items: t.items.map((x, j) => (j === i ? { ...x, company } : x)) })
                      }
                    />
                  </Field>
                </div>
              </div>
              <RowControls
                index={i}
                count={t.items.length}
                onMove={(from, to) => setT({ items: move(t.items, from, to) })}
                onRemove={() => setT({ items: t.items.filter((_, j) => j !== i) })}
              />
            </div>
          </div>
        ))}
        <Button
          onClick={() =>
            setT({ items: [...t.items, { quote: "", author: "Client", role: "", company: "" }] })
          }
        >
          <Plus className="size-4" /> Add quote
        </Button>
      </Card>

      <Card
        title="Reels ('In the detail')"
        hint="Captions and order. New videos are added by the developer."
      >
        <Toggle
          checked={r.show}
          onChange={(show) => setR({ show })}
          label="Show reels on the home page"
        />
        {r.items.map((reel, i) => (
          <div
            key={reel.name + i}
            className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
          >
            <img
              src={`/reels/${reel.name}.jpg`}
              alt=""
              className="aspect-[9/16] w-16 shrink-0 rounded-md bg-slate-100 object-cover"
            />
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <Field label="Caption">
                <TextInput
                  value={reel.caption}
                  onChange={(caption) =>
                    setR({ items: r.items.map((x, j) => (j === i ? { ...x, caption } : x)) })
                  }
                />
              </Field>
              <Field label="Link (optional)" hint="e.g. /projects/chand-bungalow">
                <TextInput
                  value={reel.href ?? ""}
                  onChange={(href) =>
                    setR({
                      items: r.items.map((x, j) =>
                        j === i ? { ...x, href: href || undefined } : x,
                      ),
                    })
                  }
                />
              </Field>
            </div>
            <RowControls
              index={i}
              count={r.items.length}
              onMove={(from, to) => setR({ items: move(r.items, from, to) })}
              onRemove={() => {
                if (confirm("Remove this reel from the site?"))
                  setR({ items: r.items.filter((_, j) => j !== i) });
              }}
            />
          </div>
        ))}
      </Card>
    </div>
  );
}
