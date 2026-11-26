import SanityPicture from "../SanityPicture";
import { hotspotObjectPosition } from "../shared";
import PlainOrRichText from "../PlainOrRichText";
import type { SectionProps } from "../types";

const highlight = "bg-black/40 box-decoration-clone px-2 py-1";

// Same as the default hero (including the optional side image), with the body text highlighted
// line by line like selected text.
export default function HeroSection({ section, project, compact = false }: SectionProps<"heroSection">) {
  const objectPosition = hotspotObjectPosition(section.image);
  const hasFeatureImage = Boolean(section.featureImage?.asset);
  // Side by side from md up (not in a section grid, where the column is too narrow); stacked above the text otherwise.
  const sideBySide = hasFeatureImage && !compact;
  const imageOnLeft = section.featureImagePosition === "left";
  // With a feature image, the stacked layout (phones, section grids) centres the image and the text
  // under it; side by side (md up) the text goes back to left-aligned next to the image.
  const stackCentred = hasFeatureImage ? `items-center text-center ${sideBySide ? "md:text-left" : ""}` : "";
  const textCentred = hasFeatureImage ? `w-full [&>*]:mx-auto ${sideBySide ? "md:[&>*]:mx-0" : ""}` : "";

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
      <div
        className={`mx-auto flex w-full max-w-4xl flex-col gap-8 ${stackCentred} ${hasFeatureImage ? "mt-12" : ""} ${
          sideBySide ? `md:items-center md:gap-10 ${imageOnLeft ? "md:flex-row" : "md:flex-row-reverse"}` : ""
        }`}
      >
        {hasFeatureImage && (
          // Optional side image. Same layout as the default hero, with square corners and a hard
          // offset shadow to match the heading's text shadow.
          <SanityPicture
            project={project}
            image={section.featureImage}
            shape={{ widths: [480, 800, 1200] }}
            sizes={sideBySide ? "(min-width: 768px) 28rem, 100vw" : "100vw"}
            alt={section.featureImage?.alt || ""}
            className={`h-auto w-full max-w-md shadow-[6px_6px_0_rgb(0_0_0/0.6)] ${sideBySide ? "md:w-2/5 md:max-w-none md:shrink-0" : ""}`}
          />
        )}
        <div className={`min-w-0 flex-1 ${textCentred}`}>
          {section.heading && <h1 className={`max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl text-shadow-[3px_3px_0_rgb(0_0_0/0.6)] ${hasFeatureImage ? "" : "mt-12"}`}>{section.heading}</h1>}
          {/* The highlight sits on an inline span so it wraps with the text, one box per line;
              box-decoration-clone gives every line its own padding, and leading-loose leaves a gap between the boxes.
              Plain text gets one highlighted paragraph; rich text gets the highlight inside each paragraph. */}
          {typeof section.body === "string" ? (
            section.body.trim() && (
              <p className="mt-5 max-w-2xl text-lg leading-loose whitespace-pre-line">
                <span className={highlight}>{section.body}</span>
              </p>
            )
          ) : (
            <PlainOrRichText
              value={section.body}
              className="mt-5 max-w-2xl text-lg leading-loose"
              components={{ block: { normal: ({ children }) => <p><span className={highlight}>{children}</span></p> } }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
