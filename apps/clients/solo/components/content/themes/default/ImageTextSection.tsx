import { PortableText } from "@portabletext/react";
import imageUrlBuilder from "@sanity/image-url";
import Link from "next/link";
import { stegaClean } from "next-sanity";
import { fullSizeImageUrl } from "../shared";
import type { SectionProps } from "../types";

export default function ImageTextSection({ section, project, compact = false }: SectionProps<"imageTextSection">) {
  const imagePosition = stegaClean(section.imagePosition);
  const imageAspectRatio = stegaClean(section.imageAspectRatio) || "original";
  const imageFirst = imagePosition !== "right";
  const ratioDimensions = {
    original: undefined,
    "1:1": { width: 1200, height: 1200 },
    "9:16": { width: 900, height: 1600 },
    "16:9": { width: 1600, height: 900 },
    "3:1": { width: 1800, height: 600 },
    "4:3": { width: 1200, height: 900 },
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
  let imageUrl = section.image?.asset?.url;
  if (section.image?.asset?._ref) {
    let imageBuilder = imageUrlBuilder(project).image(section.image).auto("format");
    imageBuilder = ratioDimensions
      ? imageBuilder.width(ratioDimensions.width).height(ratioDimensions.height).fit("crop")
      : imageBuilder.width(1600).fit("max");
    imageUrl = imageBuilder.url();
  }

  return (
    <section className={compact ? "h-full bg-slate-50 p-6" : "bg-slate-50 px-6 py-14 sm:px-10"}>
      <div className={`mx-auto grid max-w-6xl items-start ${compact ? "gap-6" : "gap-10 md:grid-cols-2"}`}>
        {imageUrl && (
          section.imageHref ? (
            <Link href={stegaClean(section.imageHref)} className={`block rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-keppel-on-light ${imageFirst ? "md:order-1" : "md:order-2"}`}>
              <img src={imageUrl} alt={section.image?.alt || ""} className={`${imageClassName} transition hover:opacity-90`} />
            </Link>
          ) : (
            // No link set in Sanity: clicking opens the full-size image in a new tab.
            <a
              href={fullSizeImageUrl(project, section.image) || imageUrl}
              target="_blank"
              rel="noreferrer"
              className={`block cursor-zoom-in rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-keppel-on-light ${imageFirst ? "md:order-1" : "md:order-2"}`}
            >
              <img src={imageUrl} alt={section.image?.alt || ""} className={imageClassName} />
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
