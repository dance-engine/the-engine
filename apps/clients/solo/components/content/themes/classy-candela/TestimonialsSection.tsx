import { PortableText } from "@portabletext/react";
import Link from "next/link";
import { stegaClean } from "next-sanity";
import SanityPicture from "../SanityPicture";
import { isTestimonial } from "../shared";
import type { SectionProps } from "../types";
import { onWine, smallCaps } from "./styles";

// A wine band (the org's secondary colour) with each short quote in large serif italics and the name
// beneath in spaced capitals. Several testimonials stack, divided by faint gold lines.
export default function TestimonialsSection({ section, project }: SectionProps<"testimonialsSection">) {
  const testimonials = section.testimonials?.filter(isTestimonial) || [];
  if (testimonials.length === 0) return null;

  return (
    <section className={`px-6 py-14 text-center sm:px-10 ${onWine}`}>
      <div className="mx-auto max-w-4xl">
        {(section.heading || section.body) && (
          <div className="mb-10">
            {section.heading && <h2 className="text-3xl sm:text-4xl">{section.heading}</h2>}
            {section.body && <p className="mx-auto mt-3 max-w-2xl text-(--section-muted)">{section.body}</p>}
          </div>
        )}
        <div className="divide-y divide-(--cc-gold)/30">
          {testimonials.map((testimonial) => {
            const attribution = (
              <span className="inline-flex items-center gap-3">
                {testimonial.image?.asset && (
                  <SanityPicture
                    project={project}
                    image={testimonial.image}
                    shape={{ aspect: 1, widths: [40, 80, 120] }}
                    sizes="40px"
                    loading="lazy"
                    alt={testimonial.image?.alt || ""}
                    className="size-10 rounded-full object-cover ring-1 ring-(--cc-gold)/60"
                  />
                )}
                <span className={smallCaps}>{testimonial.name}</span>
              </span>
            );

            return (
              <figure key={testimonial._id} className="py-8 first:pt-0 last:pb-0">
                <blockquote>
                  <p className="font-classy text-3xl italic leading-tight text-balance sm:text-4xl">
                    “{testimonial.shortQuote}”
                  </p>
                  {testimonial.quote && (
                    <div className="mx-auto mt-5 max-w-2xl text-base text-(--section-muted) [&_p]:my-2">
                      <PortableText value={testimonial.quote} />
                    </div>
                  )}
                </blockquote>
                <figcaption className="mt-5">
                  {testimonial.link ? (
                    <Link href={stegaClean(testimonial.link)} className="underline-offset-4 transition hover:underline">
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
