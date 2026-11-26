import { LuChevronDown } from "react-icons/lu";
import type { SectionProps } from "../types";
import PlainOrRichText from "../PlainOrRichText";

// Same as the default FAQ, without the dividing lines, with a bold chevron in the org's primary colour (it's the
// clickable part) and a short bar under the heading in secondary. Open animation: see the default FaqSection.
export default function FaqSection({ section }: SectionProps<"faqSection">) {
  return (
    <section className="px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-4xl">
        {section.heading && (
          <h2 className="text-3xl font-black uppercase after:mt-3 after:block after:h-1.5 after:w-16 after:bg-(--org-color-secondary)">
            {section.heading}
          </h2>
        )}
        <div className="mt-8">
          {section.items?.map((item) => (
            <details
              key={item._key}
              className="group py-4 [interpolate-size:allow-keywords] details-content:h-0 details-content:overflow-clip details-content:opacity-0 details-content:transition-[height,opacity,content-visibility] details-content:duration-300 details-content:ease-out details-content:[transition-behavior:allow-discrete] open:details-content:h-auto open:details-content:opacity-100 motion-reduce:details-content:transition-none"
            >
              <summary className="flex cursor-pointer list-none items-start gap-3 pr-8 font-semibold [&::-webkit-details-marker]:hidden">
                <LuChevronDown aria-hidden="true" strokeWidth={3.5} className="mt-0.5 size-5 shrink-0 text-(--org-color-primary) transition-transform duration-200 group-open:rotate-180" />
                <span>{item.question}</span>
              </summary>
              <PlainOrRichText value={item.answer} className="mt-3 pl-8 text-slate-600" />
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
