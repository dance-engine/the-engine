import imageUrlBuilder from "@sanity/image-url";
import Link from "next/link";
import { stegaClean } from "next-sanity";
import { fullSizeImageUrl } from "../shared";
import type { SectionProps } from "../types";

export default function ImageSection({ section, project, compact = false }: SectionProps<"imageSection">) {
  const aspectRatio = stegaClean(section.aspectRatio) || "original";
  const ratioDimensions = {
    original: undefined,
    "1:1": { width: 1600, height: 1600 },
    "9:16": { width: 900, height: 1600 },
    "16:9": { width: 1600, height: 900 },
    "3:1": { width: 1800, height: 600 },
    "4:3": { width: 1600, height: 1200 },
  }[aspectRatio];
  const ratioClass = {
    original: "",
    "1:1": "aspect-square object-cover",
    "9:16": "aspect-[9/16] object-cover",
    "16:9": "aspect-video object-cover",
    "3:1": "aspect-[3/1] object-cover",
    "4:3": "aspect-[4/3] object-cover",
  }[aspectRatio];
  let imageUrl = section.image?.asset?.url;
  if (section.image?.asset?._ref) {
    let builder = imageUrlBuilder(project)
      .image(section.image)
      .auto("format");
    builder = ratioDimensions
      ? builder.width(ratioDimensions.width).height(ratioDimensions.height).fit("crop")
      : builder.width(2000).fit("max");
    imageUrl = builder.url();
  }

  if (!imageUrl) return null;

  const image = (
    <img
      src={imageUrl}
      alt={section.image?.alt || ""}
      className={compact
        ? `h-full w-full object-cover ${ratioClass}`
        : `h-auto w-full ${ratioClass}`}
    />
  );

  return (
    <section className={compact ? "h-full bg-white" : "w-full bg-white"}>
      {section.href ? (
        <Link
          href={stegaClean(section.href)}
          className="block h-full w-full focus:outline-none focus-visible:ring-4 focus-visible:ring-keppel-on-light"
        >
          {image}
        </Link>
      ) : (
        // No link set in Sanity: clicking opens the full-size image in a new tab.
        <a
          href={fullSizeImageUrl(project, section.image) || imageUrl}
          target="_blank"
          rel="noreferrer"
          className="block h-full w-full cursor-zoom-in focus:outline-none focus-visible:ring-4 focus-visible:ring-keppel-on-light"
        >
          {image}
        </a>
      )}
    </section>
  );
}
