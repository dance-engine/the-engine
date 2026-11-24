// Theme-independent helpers. Keep data logic here so every theme renders the same content
// and a fix applies to all of them; theme components should only decide layout and styling.
import imageUrlBuilder from "@sanity/image-url";
import type { IconType } from "react-icons";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { LuAtSign } from "react-icons/lu";
import type { SocialProfile, Testimonial } from "@/lib/sanity/content";
import type { SanityProjectConfig } from "@/lib/sanity/projects";

type SanityImageSource = Parameters<ReturnType<typeof imageUrlBuilder>["image"]>[0];

/**
 * Full-size URL for opening an image on its own (e.g. in a new tab): the editor's crop is kept,
 * but no resize or aspect-ratio crop is applied.
 */
export function fullSizeImageUrl(
  project: SanityProjectConfig,
  image?: (SanityImageSource & { asset?: { _ref?: string; url?: string } }) | null,
) {
  if (image?.asset?._ref) return imageUrlBuilder(project).image(image).auto("format").url();
  return image?.asset?.url;
}

type SanityCropHotspotImage = {
  crop?: { top: number; bottom: number; left: number; right: number };
  hotspot?: { x: number; y: number; height: number; width: number };
};

/** CSS object-position that keeps a Sanity image's hotspot in view after its crop is applied. */
export function hotspotObjectPosition(image?: SanityCropHotspotImage) {
  const crop = image?.crop;
  const hotspot = image?.hotspot;
  const visibleWidth = 1 - (crop?.left || 0) - (crop?.right || 0);
  const visibleHeight = 1 - (crop?.top || 0) - (crop?.bottom || 0);
  const hotspotX = hotspot && visibleWidth > 0
    ? ((hotspot.x - (crop?.left || 0)) / visibleWidth) * 100
    : 50;
  const hotspotY = hotspot && visibleHeight > 0
    ? ((hotspot.y - (crop?.top || 0)) / visibleHeight) * 100
    : 50;
  return `${Math.min(100, Math.max(0, hotspotX))}% ${Math.min(100, Math.max(0, hotspotY))}%`;
}

export function socialPlatformLabel(platform: string) {
  return {
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    linkedin: "LinkedIn",
    x: "X",
    other: "Social",
  }[platform] || "Social";
}

export function socialPlatformIcon(platform: string): IconType {
  return {
    facebook: FaFacebookF,
    instagram: FaInstagram,
    tiktok: FaTiktok,
    youtube: FaYoutube,
    linkedin: FaLinkedinIn,
    x: FaXTwitter,
    other: LuAtSign,
  }[platform] || LuAtSign;
}

export function isSocialProfile(profile: SocialProfile | null): profile is SocialProfile {
  return Boolean(profile?.platform && profile.url);
}

export function isTestimonial(testimonial: Testimonial | null): testimonial is Testimonial {
  return Boolean(testimonial?.name && testimonial.shortQuote);
}
