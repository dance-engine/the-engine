// Theme-independent helpers. Keep data logic here so every theme renders the same content
// and a fix applies to all of them; theme components should only decide layout and styling.
import { createImageUrlBuilder } from "@sanity/image-url";
import type { CSSProperties } from "react";
import type { IconType } from "react-icons";
import type { OrganisationType } from "@dance-engine/schemas/organisation";
import { readableText } from "@dance-engine/ui/event/lib/organisationTheme";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { LuAtSign } from "react-icons/lu";
import type { SocialProfile, Testimonial } from "@/lib/sanity/content";
import type { SanityProjectConfig } from "@/lib/sanity/projects";

type SanityImageSource = Parameters<ReturnType<typeof createImageUrlBuilder>["image"]>[0];

/**
 * Full-size URL for opening an image on its own (e.g. in a new tab): the editor's crop is kept,
 * but no resize or aspect-ratio crop is applied.
 */
export function fullSizeImageUrl(
  project: SanityProjectConfig,
  image?: (SanityImageSource & { asset?: { _ref?: string; url?: string } }) | null,
) {
  if (image?.asset?._ref) return createImageUrlBuilder(project).image(image).auto("format").url();
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

type OrgColourKey = "colour_primary" | "colour_secondary" | "colour_background_light" | "colour_background_dark";

/** An org theme colour (core app → Settings → Theme) as #rrggbb, or undefined if the org hasn't set a valid one. */
function orgColour(org: OrganisationType | null | undefined, key: OrgColourKey) {
  const theme = (org as { theme?: Partial<Record<OrgColourKey, string>> } | null | undefined)?.theme;
  const value = theme?.[key]?.trim();
  if (!value || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return undefined;
  return value.length === 4
    ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase()
    : value.toLowerCase();
}

/** The theme colours the org has actually chosen. Unlike getOrganisationTheme, nothing is filled in with defaults. */
export function orgCustomColours(org: OrganisationType | null | undefined) {
  return {
    primary: orgColour(org, "colour_primary"),
    secondary: orgColour(org, "colour_secondary"),
    backgroundLight: orgColour(org, "colour_background_light"),
    backgroundDark: orgColour(org, "colour_background_dark"),
  };
}

/**
 * CSS variables for the colours the org has chosen, each with a readable text colour (white or near-black).
 * A variable is left out when the org hasn't set that colour, so the default theme can give each one a
 * fallback that keeps its own look: bg-[var(--org-custom-primary,#ce037d)].
 */
export function orgCustomColourVariables(org: OrganisationType | null | undefined): CSSProperties {
  const { primary, secondary, backgroundDark } = orgCustomColours(org);
  return {
    ...(primary && { "--org-custom-primary": primary, "--org-custom-primary-text": readableText(primary) }),
    ...(secondary && { "--org-custom-secondary": secondary, "--org-custom-secondary-text": readableText(secondary) }),
    ...(backgroundDark && { "--org-custom-background-dark": backgroundDark }),
  } as CSSProperties;
}
