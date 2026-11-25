import Link from "next/link";
import { stegaClean } from "next-sanity";
import SanityPicture from "../SanityPicture";
import { fullSizeImageUrl } from "../shared";
import type { SectionProps } from "../types";

export default function ImageSection({ section, project, compact = false }: SectionProps<"imageSection">) {
  const aspectRatio = stegaClean(section.aspectRatio) || "original";
  // Width / height to crop to; undefined keeps the original shape.
  const aspect = {
    original: undefined,
    "1:1": 1,
    "9:16": 9 / 16,
    "16:9": 16 / 9,
    "3:1": 3,
    "4:3": 4 / 3,
  }[aspectRatio];
  const ratioClass = {
    original: "",
    "1:1": "aspect-square object-cover",
    "9:16": "aspect-[9/16] object-cover",
    "16:9": "aspect-video object-cover",
    "3:1": "aspect-[3/1] object-cover",
    "4:3": "aspect-[4/3] object-cover",
  }[aspectRatio];
  if (!section.image?.asset?._ref && !section.image?.asset?.url) return null;

  const image = (
    <SanityPicture
      project={project}
      image={section.image}
      shape={{ aspect, widths: [640, 1024, 1600, 2000] }}
      // Full width on its own; in a section grid it's one of up to two columns from md up.
      sizes={compact ? "(min-width: 768px) 50vw, 100vw" : "100vw"}
      loading="lazy"
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
          href={fullSizeImageUrl(project, section.image)}
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
