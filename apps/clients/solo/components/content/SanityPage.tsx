import { PortableText } from "@portabletext/react";
import imageUrlBuilder from "@sanity/image-url";
import Link from "next/link";
import { stegaClean } from "next-sanity";
import type { IconType } from "react-icons";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTiktok, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { LuAtSign } from "react-icons/lu";
import type { PageSection, SanityContentPage, SocialProfile, Testimonial } from "@/lib/sanity/content";
import type { SanityProjectConfig } from "@/lib/sanity/projects";

export default function SanityPage({ page, project }: { page: SanityContentPage; project: SanityProjectConfig }) {
  return (
    <main className="bg-white text-slate-950">
      {page.sections?.map((section) => (
        <Section key={section._key} section={section} project={project} />
      ))}
    </main>
  );
}

function Section({ section, project }: { section: PageSection; project: SanityProjectConfig }) {
  switch (section._type) {
    case "heroSection": {
      let imageUrl = section.image?.asset?.url;
      if (section.image?.asset?._ref) {
        imageUrl = imageUrlBuilder(project)
          .image(section.image)
          .width(2000)
          .fit("max")
          .auto("format")
          .url();
      }

      const crop = section.image?.crop;
      const hotspot = section.image?.hotspot;
      const visibleWidth = 1 - (crop?.left || 0) - (crop?.right || 0);
      const visibleHeight = 1 - (crop?.top || 0) - (crop?.bottom || 0);
      const hotspotX = hotspot && visibleWidth > 0
        ? ((hotspot.x - (crop?.left || 0)) / visibleWidth) * 100
        : 50;
      const hotspotY = hotspot && visibleHeight > 0
        ? ((hotspot.y - (crop?.top || 0)) / visibleHeight) * 100
        : 50;
      const objectPosition = `${Math.min(100, Math.max(0, hotspotX))}% ${Math.min(100, Math.max(0, hotspotY))}%`;

      return (
        <section className="relative isolate flex min-h-80 items-end overflow-hidden bg-[#01164d] px-6 py-16 text-white sm:px-10">
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 -z-20 size-full object-cover"
              style={{ objectPosition }}
            />
          )}
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[rgb(0_5_34_/_55%)] to-[rgb(0_5_34_/_80%)]" />
          <div className="mx-auto w-full max-w-4xl">
            {section.heading && <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">{section.heading}</h1>}
            {section.body && <p className="mt-5 max-w-2xl text-lg text-white/85">{section.body}</p>}
          </div>
        </section>
      );
    }
    case "richTextSection":
      return (
        <section className="px-6 py-14 sm:px-10">
          <div className="prose prose-slate mx-auto max-w-4xl">
            {section.heading && <h2>{section.heading}</h2>}
            {section.body && <PortableText value={section.body} />}
          </div>
        </section>
      );
    case "imageTextSection": {
      const imagePosition = stegaClean(section.imagePosition);
      const imageAspectRatio = stegaClean(section.imageAspectRatio) || "original";
      const imageFirst = imagePosition !== "right";
      const ratioDimensions = {
        original: undefined,
        "1:1": { width: 1200, height: 1200 },
        "9:16": { width: 900, height: 1600 },
        "16:9": { width: 1600, height: 900 },
        "4:3": { width: 1200, height: 900 },
      }[imageAspectRatio];
      const imageRatioClass = {
        original: "",
        "1:1": "aspect-square",
        "9:16": "aspect-[9/16]",
        "16:9": "aspect-video",
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
        <section className="bg-slate-50 px-6 py-14 sm:px-10">
          <div className="mx-auto grid max-w-6xl items-start gap-10 md:grid-cols-2">
            {imageUrl && (
              section.imageHref ? (
                <Link href={stegaClean(section.imageHref)} className={`block rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-keppel-on-light ${imageFirst ? "md:order-1" : "md:order-2"}`}>
                  <img src={imageUrl} alt={section.image?.alt || ""} className={`${imageClassName} transition hover:opacity-90`} />
                </Link>
              ) : (
                <img src={imageUrl} alt={section.image?.alt || ""} className={`${imageClassName} ${imageFirst ? "md:order-1" : "md:order-2"}`} />
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
    case "callToActionSection":
      return (
        <section className="bg-[#01164d] px-6 py-14 text-center text-white sm:px-10">
          <div className="mx-auto max-w-3xl">
            {section.heading && <h2 className="text-3xl font-bold">{section.heading}</h2>}
            {section.body && <p className="mt-4 text-white/80">{section.body}</p>}
            {section.label && section.href && <Link href={stegaClean(section.href)} className="mt-7 inline-flex rounded-lg bg-[#ce037d] px-5 py-3 font-semibold text-white transition hover:bg-[#a90267]">{section.label}</Link>}
          </div>
        </section>
      );
    case "threeColumnCalloutSection":
      return (
        <section className="bg-[#1d1719] px-6 py-10 text-white sm:px-10">
          <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)_minmax(9rem,0.8fr)] md:gap-12">
            <div>
              {section.heading && (
                <h2 className="inline box-decoration-clone bg-cerise-logo px-2 py-1 text-3xl font-black uppercase leading-[1.05] text-[#1d1719] sm:text-4xl">
                  {section.heading}
                </h2>
              )}
            </div>
            {section.body && (
              <div className="prose prose-invert max-w-none text-white/85 prose-p:my-2 prose-p:leading-relaxed">
                <PortableText value={section.body} />
              </div>
            )}
            <div className="md:text-right">
              {section.label && section.href && (
                <Link
                  href={stegaClean(section.href)}
                  className="inline-flex rounded-sm bg-lime-300 px-5 py-3 text-sm font-bold uppercase tracking-wide text-slate-950 transition hover:bg-lime-200"
                >
                  {section.label}
                </Link>
              )}
            </div>
          </div>
        </section>
      );
    case "socialMediaSection": {
      const iconStyle = stegaClean(section.iconStyle) || "colour";
      const profiles = section.profiles?.filter(isSocialProfile) || [];
      if (profiles.length === 0) return null;

      return (
        <section className="bg-slate-100 px-6 py-14 sm:px-10">
          <div className="mx-auto max-w-5xl text-center">
            {section.heading && <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{section.heading}</h2>}
            {section.body && <p className="mx-auto mt-4 max-w-2xl text-slate-600">{section.body}</p>}
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
                    className="group inline-flex items-center gap-2 px-3 py-2 font-semibold text-slate-950 transition hover:text-cerise-on-light"
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
    case "testimonialsSection": {
      const testimonials = section.testimonials?.filter(isTestimonial) || [];
      if (testimonials.length === 0) return null;

      return (
        <section className="bg-[#01164d] px-6 py-16 text-white sm:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              {section.heading && <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{section.heading}</h2>}
              {section.body && <p className="mt-4 text-white/75">{section.body}</p>}
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial) => {
                let imageUrl = testimonial.image?.asset?.url;
                if (testimonial.image?.asset?._ref) {
                  imageUrl = imageUrlBuilder(project)
                    .image(testimonial.image)
                    .width(240)
                    .height(240)
                    .fit("crop")
                    .auto("format")
                    .url();
                }

                const attribution = (
                  <span className="inline-flex items-center gap-3">
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={testimonial.image?.alt || ""}
                        className="size-12 rounded-full object-cover"
                      />
                    )}
                    <span className="font-semibold">{testimonial.name}</span>
                  </span>
                );

                return (
                  <figure key={testimonial._id} className="flex h-full flex-col rounded-2xl bg-white/10 p-6 ring-1 ring-white/15">
                    <blockquote className="flex-1">
                      {testimonial.quote && (
                        <div className="prose prose-sm prose-invert text-white/75 prose-p:my-2">
                          <PortableText value={testimonial.quote} />
                        </div>
                      )}
                      <p className="mt-5 border-l-4 border-cerise-logo bg-white/10 px-4 py-3 text-xl font-semibold leading-snug text-white">
                        “{testimonial.shortQuote}”
                      </p>
                    </blockquote>
                    <figcaption className="mt-6 border-t border-white/15 pt-5 text-white/85">
                      {testimonial.link ? (
                        <Link href={stegaClean(testimonial.link)} className="transition hover:text-white hover:underline">
                          {attribution}
                        </Link>
                      ) : attribution}
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        </section>
      );
    }
    case "faqSection":
      return (
        <section className="px-6 py-14 sm:px-10">
          <div className="mx-auto max-w-4xl">
            {section.heading && <h2 className="text-3xl font-bold">{section.heading}</h2>}
            <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
              {section.items?.map((item) => (
                <details key={item._key} className="group py-5">
                  <summary className="cursor-pointer list-none pr-8 font-semibold">{item.question}</summary>
                  {item.answer && <p className="mt-3 text-slate-600">{item.answer}</p>}
                </details>
              ))}
            </div>
          </div>
        </section>
      );
  }
}

function socialPlatformLabel(platform: string) {
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

function isSocialProfile(profile: SocialProfile | null): profile is SocialProfile {
  return Boolean(profile?.platform && profile.url);
}

function isTestimonial(testimonial: Testimonial | null): testimonial is Testimonial {
  return Boolean(testimonial?.name && testimonial.shortQuote);
}

function socialPlatformIcon(platform: string): IconType {
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

function socialIconColour(platform: string, style: string) {
  if (style === "monochrome") return "text-cerise-on-light";
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
