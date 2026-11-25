import { PortableText } from "@portabletext/react";
import Link from "next/link";
import { stegaClean } from "next-sanity";
import SanityPicture from "../SanityPicture";
import { fullSizeImageUrl } from "../shared";
import type { SectionProps } from "../types";

export default function ImageTextSection({ section, project, compact = false }: SectionProps<"imageTextSection">) {
  const imagePosition = stegaClean(section.imagePosition);
  const imageAspectRatio = stegaClean(section.imageAspectRatio) || "original";
  const imageFirst = imagePosition !== "right";
  // Width / height to crop to; undefined keeps the original shape.
  const aspect = {
    original: undefined,
    "1:1": 1,
    "9:16": 9 / 16,
    "16:9": 16 / 9,
    "3:1": 3,
    "4:3": 4 / 3,
  }[imageAspectRatio];
  const imageRatioClass = {
    original: "",
    "1:1": "aspect-square",
    "9:16": "aspect-[9/16]",
    "16:9": "aspect-video",
    "3:1": "aspect-[3/1]",
    "4:3": "aspect-[4/3]",
  }[imageAspectRatio];
  const imageClassName = `w-full rounded-2xl object-cover ${imageRatioClass}`;
  const hasImage = Boolean(section.image?.asset?._ref || section.image?.asset?.url);
  // Half of the max-w-6xl container from md up (at most ~560px), full width below.
  const pictureProps = {
    project,
    image: section.image,
    shape: { aspect, widths: [480, 800, 1200, 1600] },
    sizes: "(min-width: 1152px) 560px, (min-width: 768px) 50vw, 100vw",
    loading: "lazy",
    alt: section.image?.alt || "",
  } as const;

  return (
    <section className={compact ? "h-full bg-slate-50 p-6" : "bg-slate-50 px-6 py-14 sm:px-10"}>
      <div className={`mx-auto grid max-w-6xl items-start ${compact ? "gap-6" : "gap-10 md:grid-cols-2"}`}>
        {hasImage && (
          section.imageHref ? (
            <Link href={stegaClean(section.imageHref)} className={`block rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-keppel-on-light ${imageFirst ? "md:order-1" : "md:order-2"}`}>
              <SanityPicture {...pictureProps} className={`${imageClassName} transition hover:opacity-90`} />
            </Link>
          ) : (
            // No link set in Sanity: clicking opens the full-size image in a new tab.
            <a
              href={fullSizeImageUrl(project, section.image)}
              target="_blank"
              rel="noreferrer"
              className={`block cursor-zoom-in rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-keppel-on-light ${imageFirst ? "md:order-1" : "md:order-2"}`}
            >
              <SanityPicture {...pictureProps} className={imageClassName} />
            </a>
          )
        )}
        <div className={`prose prose-slate ${imageFirst ? "md:order-2" : "md:order-1"}`}>
          {section.heading && <h2>{section.heading}</h2>}
          {section.body && <PortableText value={section.body} />}
        </div>
      </div>
    </section>
  );
}
