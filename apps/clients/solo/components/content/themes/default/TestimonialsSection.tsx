import { PortableText } from "@portabletext/react";
import imageUrlBuilder from "@sanity/image-url";
import Link from "next/link";
import { stegaClean } from "next-sanity";
import { isTestimonial } from "../shared";
import type { SectionProps } from "../types";

export default function TestimonialsSection({ section, project }: SectionProps<"testimonialsSection">) {
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
