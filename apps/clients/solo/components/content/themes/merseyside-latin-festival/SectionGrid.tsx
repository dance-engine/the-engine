import { stegaClean } from "next-sanity";
import type { SectionProps } from "../types";

// mlf: the default grid on a gradient panel with top and bottom edges, for depth.
export default function SectionGrid({ section, renderSection }: SectionProps<"sectionGrid">) {
  const columns = stegaClean(section.maxColumns) || 3;
  const gridColumns = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  }[columns];

  // "Show as cards" in Sanity: each item gets a lightly frosted panel with rounded corners, a faint light
  // outline and a shadow, like the testimonial cards, so it lifts off the grid's gradient.
  // Tighter than a plain grid item: 16px padding inside the card and between the image and text.
  const cardClass = section.cards ? "overflow-hidden rounded-2xl bg-white/10 shadow-lg ring-1 ring-white/15 [&>section]:p-4 [&>section>div]:gap-4" : "";

  if (!section.items?.length) return null;

  return (
    // Gradient from a slightly lighter blue at the top to a darker one at the bottom, either side of the
    // page blue (#243d82), with a faint light line along the top and a dark one along the bottom, so the
    // grid looks like a raised panel. --section-bg is cleared for the cards inside so the gradient shows
    // through them instead of each card being a flat block of page blue.
    <section className="border-t border-b border-t-white/15 border-b-black/40 bg-linear-to-b from-[#2b4794] to-[#1c3170] px-6 py-14 [--section-bg:transparent] sm:px-10">
      <div className="mx-auto max-w-7xl">
        {(section.heading || section.body) && (
          <div className="mx-auto mb-10 max-w-3xl text-center">
            {section.heading && <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{section.heading}</h2>}
            {section.body && <p className="mt-4 text-(--section-muted,var(--color-slate-600))">{section.body}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 gap-6 ${gridColumns}`}>
          {section.items.map((item) => {
            const imageRatio = item._type === "imageSection"
              ? stegaClean(item.aspectRatio) || "original"
              : null;
            const spanClass = item._type === "threeColumnCalloutSection" || imageRatio === "16:9" || imageRatio === "3:1"
              ? "sm:col-span-2"
              : imageRatio === "9:16"
                ? "sm:row-span-2"
                : "";

            return (
              <div
                key={item._key}
                className={`h-full min-w-0 [&>section]:flex [&>section]:h-full [&>section]:w-full [&>section]:items-start [&>section>div]:w-full ${spanClass} ${cardClass}`}
              >
                {renderSection(item, { compact: true })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
