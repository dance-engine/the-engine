import Link from "next/link";
import { stegaClean } from "next-sanity";
import type { SectionProps } from "../types";
import PlainOrRichText from "../PlainOrRichText";

// A band in the org's secondary colour, sloped like the header, with a primary-colour button.
// The slope is a skewed background layer (centre origin, so top and bottom stay parallel). It spills a little
// over the neighbouring sections' padding, so the section sits above them (z-10). Keep -skew-y in sync with the header.
// In a section grid (compact) it stays a flat block.
export default function CallToActionSection({ section, compact = false }: SectionProps<"callToActionSection">) {
  return (
    <section className={`relative z-10 isolate px-6 text-center text-(--org-color-secondary-text) ${compact ? "h-full bg-(--org-color-secondary) py-8" : "py-16 sm:px-10"}`}>
      {!compact && <div aria-hidden="true" className="absolute inset-0 -z-10 -skew-y-[2.5deg] bg-(--org-color-secondary)" />}
      <div className="mx-auto max-w-3xl">
        {section.heading && <h2 className="text-3xl font-black uppercase">{section.heading}</h2>}
        <PlainOrRichText value={section.body} className="mt-4 opacity-80" />
        {section.label && section.href && (
          <Link
            href={stegaClean(section.href)}
            className="mt-7 inline-flex px-6 py-3 font-bold uppercase tracking-wide bg-(--org-color-primary) text-(--org-color-primary-text) transition hover:brightness-110"
          >
            {section.label}
          </Link>
        )}
      </div>
    </section>
  );
}
