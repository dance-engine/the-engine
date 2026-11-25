import { createImageUrlBuilder } from "@sanity/image-url";
import type { ComponentPropsWithoutRef } from "react";
import type { SanityProjectConfig } from "@/lib/sanity/projects";

type SanityImageSource = Parameters<ReturnType<typeof createImageUrlBuilder>["image"]>[0];
type SanityImage = SanityImageSource & { asset?: { _ref?: string; url?: string } };

/**
 * One version of the image: the widths to offer the browser and, optionally, a shape to crop to.
 * aspect is width / height (1 = square, 16 / 9 = widescreen). Leave it out to keep the original shape.
 */
export type ImageShape = { widths: readonly number[]; aspect?: number };

type SanityPictureProps = Omit<ComponentPropsWithoutRef<"img">, "src" | "srcSet"> & {
  project: SanityProjectConfig;
  image?: SanityImage | null;
  /** Used at every screen width, or above the mobile breakpoint when `mobile` is set. */
  shape: ImageShape;
  /** Used below 768px (Tailwind's md breakpoint), e.g. a square crop for phones. */
  mobile?: ImageShape;
  /** How wide the image is drawn, so the browser can choose a width, e.g. "100vw" or "(min-width: 768px) 50vw, 100vw". */
  sizes: string;
};

const MOBILE_MEDIA = "(max-width: 767px)";

/**
 * A Sanity image served at several widths (srcset), so each screen downloads only the size it needs,
 * with an optional different shape on mobile (<picture>). Crops use fit("crop"), which keeps the
 * editor's crop and centres on their hotspot, so a square mobile version is cut around the subject.
 * Images without an asset reference (a plain URL) are shown as a single <img>.
 */
export default function SanityPicture({ project, image, shape, mobile, sizes, alt = "", ...imgProps }: SanityPictureProps) {
  if (!image?.asset?._ref) {
    return image?.asset?.url ? <img src={image.asset.url} alt={alt} {...imgProps} /> : null;
  }

  const srcSet = (version: ImageShape) => version.widths.map((width) => `${imageUrl(project, image, version, width)} ${width}w`).join(", ");
  // src is for browsers without srcset support: the largest width.
  const src = imageUrl(project, image, shape, Math.max(...shape.widths));
  const img = <img src={src} srcSet={srcSet(shape)} sizes={sizes} alt={alt} {...imgProps} />;

  if (!mobile) return img;
  return (
    <picture>
      <source media={MOBILE_MEDIA} srcSet={srcSet(mobile)} sizes={sizes} />
      {img}
    </picture>
  );
}

function imageUrl(project: SanityProjectConfig, image: SanityImage, version: ImageShape, width: number) {
  const builder = createImageUrlBuilder(project).image(image).auto("format").width(width);
  return version.aspect
    ? builder.height(Math.round(width / version.aspect)).fit("crop").url()
    : builder.fit("max").url();
}
