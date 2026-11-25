import { PortableText } from "@portabletext/react";
import Link from "next/link";
import { stegaClean } from "next-sanity";
import type { SectionProps } from "../types";

export default function ThreeColumnCalloutSection({ section }: SectionProps<"threeColumnCalloutSection">) {
  return (
    <section className="bg-[var(--org-custom-background-dark,#1d1719)] px-6 py-10 text-white sm:px-10">
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)_minmax(9rem,0.8fr)] md:gap-12">
        <div>
          {section.heading && (
            <h2 className="inline box-decoration-clone bg-[var(--org-custom-secondary,var(--color-cerise-logo))] px-2 py-1 text-3xl font-black uppercase leading-[1.05] text-[var(--org-custom-secondary-text,#1d1719)] sm:text-4xl">
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
