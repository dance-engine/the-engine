import { stegaClean } from "next-sanity";
import type { SectionProps } from "../types";

export default function SectionGrid({ section, renderSection }: SectionProps<"sectionGrid">) {
  const columns = stegaClean(section.maxColumns) || 3;
  const gridColumns = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    5: "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  }[columns];

  if (!section.items?.length) return null;

  return (
    <section className="bg-(--section-bg,var(--color-white)) px-6 py-14 sm:px-10">
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
                className={`h-full min-w-0 [&>section]:flex [&>section]:h-full [&>section]:w-full [&>section]:items-center [&>section>div]:w-full ${spanClass}`}
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
