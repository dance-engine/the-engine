import { stegaClean } from "next-sanity";
import type { SectionProps } from "../types";
import { goldRule } from "./styles";

// A jump target; with "Show title" on, a serif italic heading with a gold rule, like the other section headings.
export default function MenuJumpSection({ section }: SectionProps<"menuJumpSection">) {
  // stegaClean: in preview the anchor carries invisible edit markers that would break the id.
  const anchor = stegaClean(section.anchor?.current);
  if (!anchor) return null;
  return section.showTitle && section.title ? (
    <section id={anchor} className="scroll-mt-4 bg-(--section-bg) px-6 pt-16 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-4xl italic sm:text-5xl">{section.title}</h2>
        <span aria-hidden="true" className={`mt-5 ${goldRule}`} />
      </div>
    </section>
  ) : (
    <div id={anchor} aria-hidden="true" className="scroll-mt-4" />
  );
}
