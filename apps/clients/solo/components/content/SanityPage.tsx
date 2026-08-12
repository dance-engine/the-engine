import { PortableText } from "@portabletext/react";
import imageUrlBuilder from "@sanity/image-url";
import Link from "next/link";
import type { PageSection, SanityContentPage } from "@/lib/sanity/content";
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
    case "heroSection":
      return (
        <section
          className="relative isolate flex min-h-80 items-end overflow-hidden bg-[#01164d] px-6 py-16 text-white sm:px-10"
          style={section.image?.asset?.url ? { backgroundImage: `linear-gradient(rgb(0 5 34 / 55%), rgb(0 5 34 / 80%)), url(${section.image.asset.url})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}
        >
          <div className="mx-auto w-full max-w-4xl">
            {section.heading && <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">{section.heading}</h1>}
            {section.body && <p className="mt-5 max-w-2xl text-lg text-white/85">{section.body}</p>}
          </div>
        </section>
      );
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
      const imageFirst = section.imagePosition !== "right";
      const ratioDimensions = {
        original: undefined,
        "1:1": { width: 1200, height: 1200 },
        "9:16": { width: 900, height: 1600 },
        "16:9": { width: 1600, height: 900 },
        "4:3": { width: 1200, height: 900 },
      }[section.imageAspectRatio || "original"];
      const imageRatioClass = {
        original: "",
        "1:1": "aspect-square",
        "9:16": "aspect-[9/16]",
        "16:9": "aspect-video",
        "4:3": "aspect-[4/3]",
      }[section.imageAspectRatio || "original"];
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
                <Link href={section.imageHref} className={`block rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-keppel-on-light ${imageFirst ? "md:order-1" : "md:order-2"}`}>
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
            {section.label && section.href && <Link href={section.href} className="mt-7 inline-flex rounded-lg bg-[#ce037d] px-5 py-3 font-semibold text-white transition hover:bg-[#a90267]">{section.label}</Link>}
          </div>
        </section>
      );
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
