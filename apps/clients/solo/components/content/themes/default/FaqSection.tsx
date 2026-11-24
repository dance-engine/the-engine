import type { SectionProps } from "../types";

export default function FaqSection({ section }: SectionProps<"faqSection">) {
  return (
    <section className="px-6 py-14 sm:px-10">
      <div className="mx-auto max-w-4xl">
        {section.heading && <h2 className="text-3xl font-bold">{section.heading}</h2>}
        <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
          {section.items?.map((item) => (
            <details key={item._key} className="group py-5">
              <summary className="cursor-pointer list-none pr-8 font-semibold">{item.question}</summary>
              {item.answer && <p className="mt-3 text-slate-600">{item.answer}</p>}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
