import { PortableText } from "@portabletext/react";
import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import { stegaClean } from "next-sanity";
import type { SectionProps } from "../types";

// Same layout as the default callout, with its fixed cerise and lime swapped for the org's colours:
// the heading highlight in secondary and the button in primary (primary is kept for clickable things).
// From md up the heading and button columns are sized to their content and never wrap (auto + whitespace-nowrap);
// the body in the middle takes the remaining space. Below md the three stack.
export default function ThreeColumnCalloutSection({ section }: SectionProps<"threeColumnCalloutSection">) {
  return (
    <section className="bg-black px-6 py-10 text-white sm:px-10">
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-12">
        <div>
          {section.heading && (
            <h2 className="inline box-decoration-clone bg-(--org-color-secondary) px-2 py-1 text-3xl font-black uppercase leading-[1.05] text-(--org-color-secondary-text) sm:text-4xl md:whitespace-nowrap">
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
              className="group inline-flex items-center gap-2 whitespace-nowrap bg-(--org-color-primary) px-5 py-3 text-sm font-bold uppercase tracking-wide text-(--org-color-primary-text) transition hover:brightness-110"
            >
              {section.label}
              <LuArrowRight aria-hidden="true" strokeWidth={3} className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
