import Link from "next/link";
import { stegaClean } from "next-sanity";
import PlainOrRichText from "../PlainOrRichText";
import type { SectionProps } from "../types";
import { onWine } from "./styles";

// A wine band (secondary) with a serif italic line and one button. The button is the org's primary colour
// with a gold edge, so it still stands out if primary and secondary are close shades of the same red.
export default function CallToActionSection({ section, compact = false }: SectionProps<"callToActionSection">) {
  return (
    <section className={`px-6 text-center ${onWine} ${compact ? "h-full py-10" : "py-16 sm:px-10"}`}>
      <div className="mx-auto max-w-3xl">
        {section.heading && <h2 className="text-4xl italic sm:text-5xl">{section.heading}</h2>}
        <PlainOrRichText value={section.body} className="mx-auto mt-4 max-w-xl text-(--section-muted)" />
        {section.label && section.href && (
          <Link
            href={stegaClean(section.href)}
            className="mt-8 inline-flex items-center border border-(--cc-gold) bg-(--cc-action) px-8 py-3 text-sm font-medium uppercase tracking-[0.2em] text-(--cc-action-text) transition hover:brightness-110"
          >
            {section.label}
          </Link>
        )}
      </div>
    </section>
  );
}
