import { stegaClean } from "next-sanity";
import type { SectionProps } from "../types";

export default function MenuJumpSection({ section }: SectionProps<"menuJumpSection">) {
  // stegaClean: in preview the anchor carries invisible edit markers that would break the id.
  const anchor = stegaClean(section.anchor?.current);
  if (!anchor) return null;
  return section.showTitle && section.title ? (
    <section id={anchor} className="scroll-mt-4 px-6 pt-14 sm:px-10">
      <h2 className="mx-auto max-w-4xl text-3xl font-bold">{section.title}</h2>
    </section>
  ) : (
    <div id={anchor} aria-hidden="true" className="scroll-mt-4" />
  );
}
