import { LuChevronDown } from "react-icons/lu";
import type { SectionProps } from "../types";
import PlainOrRichText from "../PlainOrRichText";

export default function FaqSection({ section }: SectionProps<"faqSection">) {
  return (
    <section className="px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-4xl">
        {section.heading && <h2 className="text-3xl font-bold">{section.heading}</h2>}
        <div className="mt-8 divide-y divide-(--section-border,var(--color-slate-200)) border-y border-(--section-border,var(--color-slate-200))">
          {section.items?.map((item) => (
            // Open/close animation on the answer's ::details-content box: height and opacity transition between
            // closed (h-0, transparent) and open (h-auto, opaque). [interpolate-size:allow-keywords] lets height
            // animate to auto, and allow-discrete keeps the content visible while it closes. Browsers without
            // interpolate-size still fade but the height snaps; older ones just open instantly.
            <details
              key={item._key}
              className="group py-5 [interpolate-size:allow-keywords] details-content:h-0 details-content:overflow-clip details-content:opacity-0 details-content:transition-[height,opacity,content-visibility] details-content:duration-300 details-content:ease-out details-content:[transition-behavior:allow-discrete] open:details-content:h-auto open:details-content:opacity-100 motion-reduce:details-content:transition-none"
            >
              {/* [&::-webkit-details-marker]:hidden hides Safari's built-in triangle, which list-none doesn't remove. */}
              <summary className="flex cursor-pointer list-none items-start gap-3 pr-8 font-semibold [&::-webkit-details-marker]:hidden">
                <LuChevronDown aria-hidden="true" className="mt-1 size-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
                <span>{item.question}</span>
              </summary>
              <PlainOrRichText value={item.answer} className="mt-3 pl-7 text-(--section-muted,var(--color-slate-600))" />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
