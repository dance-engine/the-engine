import { PortableText } from "@portabletext/react";
import Link from "next/link";
import { stegaClean } from "next-sanity";
import SanityPicture from "../SanityPicture";
import { fullSizeImageUrl } from "../shared";
import type { SectionProps } from "../types";
import { goldRule } from "./styles";

// The default image-and-text layout with square-cornered photos and a gold rule under the heading.
// In a section grid (compact) it becomes a card: the photo edge to edge on top, the text beneath with a
// gold line between them, so a grid of these reads like the "Plan your visit" tiles.
export default function ImageTextSection({ section, project, compact = false }: SectionProps<"imageTextSection">) {
  const imagePosition = stegaClean(section.imagePosition);
  const imageAspectRatio = stegaClean(section.imageAspectRatio) || "original";
  const imageFirst = imagePosition !== "right";
  // Sanity "Text alignment": level with the top of the image or centred on it. Side by side (md up) only.
  const alignText = stegaClean(section.verticalAlignment) === "center" ? "md:items-center" : "md:items-start";
  const imageWidth = stegaClean(section.imageWidth) || "1/2";
  const columns = {
    "1/3": imageFirst ? "md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]" : "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
    "1/2": "md:grid-cols-2",
    "2/3": imageFirst ? "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]" : "md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]",
  }[imageWidth];
  const imageSizes = compact
    ? "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
    : {
        "1/3": "(min-width: 1152px) 360px, (min-width: 768px) 33vw, 100vw",
        "1/2": "(min-width: 1152px) 560px, (min-width: 768px) 50vw, 100vw",
        "2/3": "(min-width: 1152px) 750px, (min-width: 768px) 67vw, 100vw",
      }[imageWidth];
  // Cards default to a landscape crop so a row of them lines up; elsewhere "original" keeps the image's shape.
  const ratio = compact && imageAspectRatio === "original" ? "16:9" : imageAspectRatio;
  const aspect = { original: undefined, "1:1": 1, "9:16": 9 / 16, "16:9": 16 / 9, "3:1": 3, "4:3": 4 / 3 }[ratio];
  const imageRatioClass = {
    original: "",
    "1:1": "aspect-square",
    "9:16": "aspect-[9/16]",
    "16:9": "aspect-video",
    "3:1": "aspect-[3/1]",
    "4:3": "aspect-[4/3]",
  }[ratio];
  const imageClassName = `w-full object-cover ${imageRatioClass}`;
  const hasImage = Boolean(section.image?.asset?._ref || section.image?.asset?.url);
  const pictureProps = {
    project,
    image: section.image,
    shape: { aspect, widths: [480, 800, 1200, 1600] },
    sizes: imageSizes,
    loading: "lazy",
    alt: section.image?.alt || "",
  } as const;
  const linkFocus = "block focus:outline-none focus-visible:ring-2 focus-visible:ring-(--cc-action) focus-visible:ring-offset-2";

  const image = hasImage && (
    section.imageHref ? (
      <Link href={stegaClean(section.imageHref)} className={`${linkFocus} ${compact ? "" : imageFirst ? "md:order-1" : "md:order-2"}`}>
        <SanityPicture {...pictureProps} className={`${imageClassName} transition hover:opacity-90`} />
      </Link>
    ) : (
      // No link set in Sanity: clicking opens the full-size image in a new tab.
      <a
        href={fullSizeImageUrl(project, section.image)}
        target="_blank"
        rel="noreferrer"
        className={`${linkFocus} cursor-zoom-in ${compact ? "" : imageFirst ? "md:order-1" : "md:order-2"}`}
      >
        <SanityPicture {...pictureProps} className={imageClassName} />
      </a>
    )
  );

  if (compact) {
    return (
      <section className="h-full bg-(--section-bg)">
        <div className="flex h-full flex-col">
          {image}
          <div className={`prose flex-1 px-5 py-4 prose-p:my-2 ${hasImage ? "border-t border-(--cc-gold)/60" : ""}`}>
            {section.heading && <h2 className="!my-0 text-2xl sm:text-3xl">{section.heading}</h2>}
            {section.body && <PortableText value={section.body} />}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-(--section-bg) px-6 py-16 sm:px-10">
      <div className={`mx-auto grid max-w-6xl items-start gap-10 md:gap-14 ${columns} ${alignText}`}>
        {image}
        <div className={`prose prose-lg ${imageFirst ? "md:order-2" : "md:order-1"}`}>
          {section.heading && (
            <>
              <h2 className="!mb-0 text-4xl sm:text-5xl">{section.heading}</h2>
              <span aria-hidden="true" className={`my-6 ${goldRule}`} />
            </>
          )}
          {section.body && <PortableText value={section.body} />}
        </div>
      </div>
    </section>
  );
}
