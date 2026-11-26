import { stegaClean } from "next-sanity";
import type { SectionProps } from "../types";
import { goldRule, onSurfaceLight } from "./styles";

// The default grid with a centred serif heading and gold rule. "Show as cards" gives each item a fine gold
// border, square corners and the surface-light colour, instead of the default rounded, shadowed card.
export default function SectionGrid({ section, renderSection }: SectionProps<"sectionGrid">) {
  const columns = stegaClean(section.maxColumns) || 3;
  const gridColumns = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  }[columns];

  // Cards are surface-light panels with that surface's text; the --section-* variables it sets carry both
  // into the item inside (e.g. image and text).
  const cardClass = section.cards ? `overflow-hidden border border-(--cc-gold)/60 ${onSurfaceLight}` : "";

  if (!section.items?.length) return null;

  return (
    <section className="bg-(--section-bg) px-6 py-16 sm:px-10">
      <div className="mx-auto max-w-6xl">
        {(section.heading || section.body) && (
          <div className="mx-auto mb-10 max-w-3xl text-center">
            {section.heading && (
              <>
                <h2 className="text-4xl sm:text-5xl">{section.heading}</h2>
                <span aria-hidden="true" className={`mx-auto mt-5 ${goldRule}`} />
              </>
            )}
            {section.body && <p className="mt-5 text-(--section-muted)">{section.body}</p>}
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
