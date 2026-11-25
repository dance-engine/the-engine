import SanityPicture from "../SanityPicture";
import { hotspotObjectPosition } from "../shared";
import type { SectionProps } from "../types";

// Same as the default hero, with the body text highlighted line by line like selected text.
export default function HeroSection({ section, project }: SectionProps<"heroSection">) {
  const objectPosition = hotspotObjectPosition(section.image);

  return (
    <section className="relative isolate flex min-h-80 items-end overflow-hidden bg-de-background-dark px-6 py-16 text-white sm:px-10">
      {/* Full-width wide image on desktop; square crop around the hotspot on mobile, where the hero is
          roughly square. object-cover + the hotspot position handle whatever shape the box ends up.
          It's the main image the page waits on, so load it straight away. */}
      <SanityPicture
        project={project}
        image={section.image}
        shape={{ widths: [1024, 1600, 2400] }}
        mobile={{ aspect: 1, widths: [480, 768, 1080] }}
        sizes="100vw"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className="absolute inset-0 -z-20 size-full object-cover"
        style={{ objectPosition }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[rgb(0_5_34_/_15%)] to-[rgb(0_5_34_/_30%)]" />
      <div className="mx-auto w-full max-w-4xl">
        {section.heading && <h1 className="max-w-3xl text-4xl mt-12 font-bold tracking-tight sm:text-6xl text-shadow-[3px_3px_0_rgb(0_0_0/0.6)]">{section.heading}</h1>}
        {section.body && (
          // The highlight sits on an inline span so it wraps with the text, one box per line;
          // box-decoration-clone gives every line its own padding, and leading-loose leaves a gap between the boxes.
          <p className="mt-5 max-w-2xl text-lg leading-loose">
            <span className="bg-black/40 box-decoration-clone px-2 py-1">{section.body}</span>
          </p>
        )}
      </div>
    </section>
  );
}
