import { stegaClean } from "next-sanity";
import { isSocialProfile, socialPlatformIcon, socialPlatformLabel } from "../shared";
import type { SectionProps } from "../types";

export default function SocialMediaSection({ section }: SectionProps<"socialMediaSection">) {
  const iconStyle = stegaClean(section.iconStyle) || "colour";
  const profiles = section.profiles?.filter(isSocialProfile) || [];
  if (profiles.length === 0) return null;

  return (
    <section className="bg-(--section-bg,var(--color-slate-100)) px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-5xl text-center">
        {section.heading && <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{section.heading}</h2>}
        {section.body && <p className="mx-auto mt-4 max-w-2xl text-(--section-muted,var(--color-slate-600))">{section.body}</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {profiles.map((profile) => {
            const platform = stegaClean(profile.platform);
            const Icon = socialPlatformIcon(platform);
            return (
              <a
                key={profile._id}
                href={stegaClean(profile.url)}
                target="_blank"
                rel="noreferrer"
                aria-label={`${profile.label} on ${socialPlatformLabel(platform)}`}
                className="group inline-flex items-center gap-2 px-3 py-2 font-semibold text-(--section-fg,var(--color-slate-950)) transition hover:text-[var(--org-custom-primary,var(--color-cerise-on-light))]"
              >
                <Icon
                  aria-hidden="true"
                  className={`size-6 transition group-hover:scale-110 ${socialIconColour(platform, iconStyle)}`}
                />
                <span>{profile.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function socialIconColour(platform: string, style: string) {
  if (style === "monochrome") return "text-[var(--org-custom-primary,var(--color-cerise-on-light))]";
  if (style === "blackWhite") return "text-black";

  return {
    facebook: "text-[#1877f2]",
    instagram: "text-[#e4405f]",
    tiktok: "text-black",
    youtube: "text-[#ff0000]",
    linkedin: "text-[#0a66c2]",
    x: "text-black",
    other: "text-[#01164d]",
  }[platform] || "text-[#01164d]";
}
