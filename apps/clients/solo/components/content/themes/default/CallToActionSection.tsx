import Link from "next/link";
import { stegaClean } from "next-sanity";
import type { SectionProps } from "../types";
import PlainOrRichText from "../PlainOrRichText";

export default function CallToActionSection({ section, compact = false }: SectionProps<"callToActionSection">) {
  return (
    <section className={`bg-[var(--org-custom-background-dark,#01164d)] px-6 text-center text-white ${compact ? "h-full py-8" : "py-14 sm:px-10"}`}>
      <div className="mx-auto max-w-3xl">
        {section.heading && <h2 className="text-3xl font-bold">{section.heading}</h2>}
        <PlainOrRichText value={section.body} className="mt-4 text-white/80" />
        {section.label && section.href && <Link href={stegaClean(section.href)} className="mt-7 inline-flex rounded-lg bg-[var(--org-custom-primary,#ce037d)] px-5 py-3 font-semibold text-[var(--org-custom-primary-text,white)] transition hover:brightness-90">{section.label}</Link>}
      </div>
    </section>
  );
}
