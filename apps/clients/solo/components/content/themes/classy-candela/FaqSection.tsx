import { LuPlus } from "react-icons/lu";
import PlainOrRichText from "../PlainOrRichText";
import type { SectionProps } from "../types";
import { goldRule, onSurfaceLight } from "./styles";

// Serif italic heading with a gold rule, questions between fine gold lines, and a plus on the right
// (the clickable part, in the primary colour) that turns into a cross when open.
// Open animation: see the default FaqSection.
export default function FaqSection({ section }: SectionProps<"faqSection">) {
  return (
    // On surface light, so the questions sit in their own slightly deeper band below the page sections.
    <section className={`px-6 py-16 sm:px-10 ${onSurfaceLight}`}>
      <div className="mx-auto max-w-4xl">
        {section.heading && (
          <>
            <h2 className="text-4xl italic sm:text-5xl">{section.heading}</h2>
            <span aria-hidden="true" className={`mt-5 ${goldRule}`} />
          </>
        )}
        <div className="mt-8 divide-y divide-(--section-border) border-b border-(--section-border)">
          {section.items?.map((item) => (
            <details
              key={item._key}
              className="group py-5 [interpolate-size:allow-keywords] details-content:h-0 details-content:overflow-clip details-content:opacity-0 details-content:transition-[height,opacity,content-visibility] details-content:duration-300 details-content:ease-out details-content:[transition-behavior:allow-discrete] open:details-content:h-auto open:details-content:opacity-100 motion-reduce:details-content:transition-none"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <LuPlus
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="size-6 shrink-0 text-(--cc-action) transition-transform duration-200 group-open:rotate-45"
                />
              </summary>
              <PlainOrRichText value={item.answer} className="mt-3 max-w-3xl pr-12 text-(--section-muted)" />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
