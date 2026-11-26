import SanityPicture from "../SanityPicture";
import PlainOrRichText from "../PlainOrRichText";
import { hotspotObjectPosition } from "../shared";
import type { SectionProps } from "../types";
import { goldRule, onDark } from "./styles";

// Large serif heading over the photo, which fades into the dark background: from the bottom on phones
// (text centred over the lower part) and from the left on wider screens (text on the left, photo on the right).
// Italic text in the body (e.g. a strapline) comes out in the serif.
export default function HeroSection({ section, project, compact = false }: SectionProps<"heroSection">) {
  const objectPosition = hotspotObjectPosition(section.image);
  const hasFeatureImage = Boolean(section.featureImage?.asset);
  const sideBySide = hasFeatureImage && !compact;
  const imageOnLeft = section.featureImagePosition === "left";

  return (
    <section
      className={`relative isolate flex overflow-hidden px-6 sm:px-10 ${onDark} ${
        compact ? "h-full min-h-72 items-end py-10" : "min-h-[34rem] items-end py-14 md:min-h-[36rem] md:items-center md:py-20"
      }`}
    >
      <SanityPicture
        project={project}
        image={section.image}
        shape={{ widths: [1024, 1600, 2400] }}
        mobile={{ aspect: 3 / 4, widths: [480, 768, 1080] }}
        sizes="100vw"
        alt=""
        aria-hidden="true"
        fetchPriority="high"
        className="absolute inset-0 -z-20 size-full object-cover"
        style={{ objectPosition }}
      />
      {/* Phones: dark from the bottom up. md+: dark on the left, clearing towards the right. */}
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-(--cc-dark) via-(--cc-dark)/70 to-transparent md:bg-linear-to-r md:from-(--cc-dark) md:via-(--cc-dark)/75 md:to-transparent" />

      <div
        className={`mx-auto flex w-full max-w-6xl flex-col gap-10 ${
          sideBySide ? `md:items-center ${imageOnLeft ? "md:flex-row" : "md:flex-row-reverse"}` : ""
        }`}
      >
        {hasFeatureImage && (
          // Framed like a print: square corners with a fine gold outline set just off the image.
          <SanityPicture
            project={project}
            image={section.featureImage}
            shape={{ widths: [480, 800, 1200] }}
            sizes={sideBySide ? "(min-width: 768px) 28rem, 100vw" : "100vw"}
            alt={section.featureImage?.alt || ""}
            className={`mx-auto h-auto w-full max-w-md outline outline-offset-6 outline-(--cc-gold)/60 ${sideBySide ? "md:mx-0 md:w-2/5 md:max-w-none md:shrink-0" : ""}`}
          />
        )}
        <div className={`min-w-0 flex-1 text-center md:text-left ${compact ? "" : "md:max-w-2xl"}`}>
          {section.heading && (
            <h1 className={`text-balance leading-[0.95] ${compact ? "text-4xl" : "text-5xl sm:text-7xl"}`}>
              {section.heading}
            </h1>
          )}
          <span aria-hidden="true" className={`mx-auto mt-6 md:mx-0 ${goldRule}`} />
          <PlainOrRichText
            value={section.body}
            className="mx-auto mt-6 max-w-xl text-lg text-(--section-muted) md:mx-0 [&_em]:font-classy [&_em]:text-2xl"
          />
        </div>
      </div>
    </section>
  );
}
