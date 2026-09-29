import Counter from "@/components/ui/Counter";
import ContourLines from "@/components/ui/ContourLines";
import SectionIndex from "@/components/ui/SectionIndex";
import Reveal from "@/components/ui/Reveal";
import { getStudio } from "@/lib/content";

/** Driessen's numbers band. */
export default async function Stats() {
  const studio = await getStudio();
  if (!studio.showStats || studio.stats.length === 0) return null;

  return (
    <section aria-labelledby="stats-heading" className="relative overflow-hidden py-12 md:py-24">
      {/* Four numbers on an otherwise blank band - the lines give them a
          ground to stand on. */}
      <ContourLines
        className="text-ink/12 absolute inset-x-0 bottom-[-6%] hidden md:block"
        seed={4}
        count={11}
        amplitude={28}
      />

      <div className="container-site relative">
        <SectionIndex index="1.6" label="By the numbers" />
        <h2 id="stats-heading" className="sr-only">
          The practice by the numbers
        </h2>

        <Reveal
          childrenStagger
          className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 md:mt-12 md:gap-y-12 lg:grid-cols-4"
        >
          {studio.stats.map((stat) => (
            <div key={stat.label}>
              <p className="display text-display-l">
                <Counter to={stat.value} suffix={stat.suffix} />
              </p>
              <p className="label text-ink/45 mt-3">{stat.label}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
