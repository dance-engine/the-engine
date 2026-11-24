import imageUrlBuilder from "@sanity/image-url";
import { hotspotObjectPosition } from "../shared";
import type { SectionProps } from "../types";

export default function HeroSection({ section, project }: SectionProps<"heroSection">) {
  let imageUrl = section.image?.asset?.url;
  if (section.image?.asset?._ref) {
    imageUrl = imageUrlBuilder(project)
      .image(section.image)
      .width(2000)
      .fit("max")
      .auto("format")
      .url();
  }

  const objectPosition = hotspotObjectPosition(section.image);

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
