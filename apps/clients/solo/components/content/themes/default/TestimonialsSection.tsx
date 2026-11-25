import { PortableText } from "@portabletext/react";
import Link from "next/link";
import { stegaClean } from "next-sanity";
import SanityPicture from "../SanityPicture";
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
            const attribution = (
              <span className="inline-flex items-center gap-3">
                {/* Drawn at 48px (size-12); 96 and 144 cover 2x and 3x screens. */}
                <SanityPicture
                  project={project}
                  image={testimonial.image}
                  shape={{ aspect: 1, widths: [48, 96, 144] }}
                  sizes="48px"
                  loading="lazy"
                  alt={testimonial.image?.alt || ""}
                  className="size-12 rounded-full object-cover"
                />
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
