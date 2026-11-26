import SanityPicture from "../SanityPicture";
import { hotspotObjectPosition } from "../shared";
import type { SectionProps } from "../types";

export default function HeroSection({ section, project, compact = false }: SectionProps<"heroSection">) {
  const objectPosition = hotspotObjectPosition(section.image);
  const hasFeatureImage = Boolean(section.featureImage?.asset);
  // Side by side from md up (not in a section grid, where the column is too narrow); stacked above the text otherwise.
  const sideBySide = hasFeatureImage && !compact;
  const imageOnLeft = section.featureImagePosition === "left";

  return (
    <section className="relative isolate flex min-h-80 items-end overflow-hidden bg-[var(--org-custom-background-dark,#01164d)] px-6 py-16 text-white sm:px-10">
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
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[rgb(0_5_34_/_55%)] to-[rgb(0_5_34_/_80%)]" />
      <div
        className={`mx-auto flex w-full max-w-4xl flex-col gap-8 ${
          sideBySide ? `md:items-center md:gap-10 ${imageOnLeft ? "md:flex-row" : "md:flex-row-reverse"}` : ""
        }`}
      >
        {hasFeatureImage && (
          // Keeps its own shape (no crop). First in the markup so it sits above the text on phones;
          // flex-row-reverse moves it to the right on desktop.
          <SanityPicture
            project={project}
            image={section.featureImage}
            shape={{ widths: [480, 800, 1200] }}
            sizes={sideBySide ? "(min-width: 768px) 28rem, 100vw" : "100vw"}
            alt={section.featureImage?.alt || ""}
            className={`h-auto w-full max-w-md rounded-lg shadow-lg ${sideBySide ? "md:w-2/5 md:max-w-none md:shrink-0" : ""}`}
          />
        )}
        <div className="min-w-0 flex-1">
          {section.heading && <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl text-shadow-[3px_3px_0_rgb(0_0_0/0.6)]">{section.heading}</h1>}
          {section.body && <p className="mt-5 max-w-2xl text-lg text-white/85 whitespace-pre-line">{section.body}</p>}
        </div>
      </div>
    </section>
  );
}
