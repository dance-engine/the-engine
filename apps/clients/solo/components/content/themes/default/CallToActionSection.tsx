import Link from "next/link";
import { stegaClean } from "next-sanity";
import type { SectionProps } from "../types";

export default function CallToActionSection({ section, compact = false }: SectionProps<"callToActionSection">) {
  return (
    <section className={`bg-[#01164d] px-6 text-center text-white ${compact ? "h-full py-8" : "py-14 sm:px-10"}`}>
      <div className="mx-auto max-w-3xl">
        {section.heading && <h2 className="text-3xl font-bold">{section.heading}</h2>}
        {section.body && <p className="mt-4 text-white/80">{section.body}</p>}
        {section.label && section.href && <Link href={stegaClean(section.href)} className="mt-7 inline-flex rounded-lg bg-[#ce037d] px-5 py-3 font-semibold text-white transition hover:bg-[#a90267]">{section.label}</Link>}
      </div>
    </section>
  );
}
