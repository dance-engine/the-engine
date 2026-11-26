import { PortableText } from "@portabletext/react";
import Link from "next/link";
import { stegaClean } from "next-sanity";
import type { SectionProps } from "../types";
import { onSurfaceDark, outlineButtonOnDark } from "./styles";

// Heading, text and button in three columns on surface dark, divided by fine gold lines
// (like the evening's timetable). Stacks on phones, with the lines between the rows instead.
export default function ThreeColumnCalloutSection({ section }: SectionProps<"threeColumnCalloutSection">) {
  return (
    <section className={`px-6 py-12 sm:px-10 ${onSurfaceDark}`}>
      <div className="mx-auto grid max-w-6xl items-center divide-y divide-(--cc-gold)/40 md:grid-cols-[minmax(min-content,1fr)_minmax(0,2.2fr)_minmax(10rem,0.9fr)] md:divide-x md:divide-y-0">
        <div className="pb-6 md:pr-10 md:pb-0">
          {section.heading && <h2 className="text-4xl leading-tight italic sm:text-5xl">{section.heading}</h2>}
        </div>
        {section.body && (
          // Plain prose: PageShell points its colours at this area's text, so no prose-invert.
          <div className="prose max-w-none py-6 prose-p:my-2 prose-p:leading-relaxed md:px-10 md:py-0">
            <PortableText value={section.body} />
          </div>
        )}
        <div className="pt-6 md:pl-10 md:pt-0 md:text-right">
          {section.label && section.href && (
            <Link href={stegaClean(section.href)} className={outlineButtonOnDark}>
              {section.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
