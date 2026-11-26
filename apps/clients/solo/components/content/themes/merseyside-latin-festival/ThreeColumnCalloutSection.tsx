import { PortableText } from "@portabletext/react";
import Link from "next/link";
import { stegaClean } from "next-sanity";
import type { SectionProps } from "../types";

// The default callout, with the heading on the yellow from the mlf logo instead of the org's secondary colour,
// and a heading column that's never narrower than its longest word (min-content), so a long one-word heading
// squeezes the middle column instead of overflowing into it.
export default function ThreeColumnCalloutSection({ section }: SectionProps<"threeColumnCalloutSection">) {
  return (
    // Two shadows below (negative spreads hide both at the top), so the callout looks like it floats over the page
    // blue: a short, darker one close to the edge for lift, and a long, faint one that fades out about 44px down.
    // relative z-10 draws them over the next section, which would otherwise cover them.
    <section className="relative z-10 bg-[var(--org-custom-background-dark,#1d1719)] px-6 py-10 text-white shadow-[0_8px_12px_-8px_rgb(0_0_0/0.4),0_24px_40px_-20px_rgb(0_0_0/0.3)] sm:px-10">
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[minmax(min-content,1fr)_minmax(0,2.4fr)_minmax(9rem,0.8fr)] md:gap-12">
        <div>
          {section.heading && (
            <h2 className="inline box-decoration-clone bg-[#ffdc6e] px-2 py-1 text-3xl font-black uppercase leading-[1.05] text-slate-950 sm:text-4xl">
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
              className="inline-flex rounded-sm bg-[var(--org-custom-primary,var(--color-lime-300))] px-5 py-3 text-sm font-bold uppercase tracking-wide text-[var(--org-custom-primary-text,var(--color-slate-950))] transition hover:brightness-110"
            >
              {section.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
