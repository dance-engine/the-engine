import { PortableText } from "@portabletext/react";
import type { SectionProps } from "../types";

export default function RichTextSection({ section, compact = false }: SectionProps<"richTextSection">) {
  return (
    <section className={compact ? "h-full bg-(--section-bg,var(--color-slate-50)) p-6" : "px-6 py-14 sm:px-10"}>
      <div className="prose prose-slate mx-auto max-w-4xl">
        {section.heading && <h2>{section.heading}</h2>}
        {section.body && <PortableText value={section.body} />}
      </div>
    </section>
  );
}
