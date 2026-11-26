import { stegaClean } from "next-sanity";
import type { SectionProps } from "../types";

// Two columns of sections: the main column takes two thirds of the width and the sidebar one third,
// on whichever side the editor picked. Below lg (where the section grid also stops being three across) they
// stack with the main column first, so the page's main content comes before the extras.
//
// Main-column sections render as normal (full) sections, so e.g. image and text can still sit side by side
// in the wider column. Sidebar sections render compact, as in a section grid, since the column is narrow.

type SidebarLayoutOptions = {
  /** Outer section: background and padding. Match the theme's SectionGrid so the sidebar lines up with a grid's third column. */
  sectionClassName?: string;
  /** Container width. Match the theme's SectionGrid. */
  containerClassName?: string;
};

/**
 * The sidebar layout, for themes to reuse with their own outer sizes. The defaults match default/SectionGrid.tsx
 * (padding, max-w-7xl, gap-6, three columns from lg), so the sidebar is exactly as wide as a grid's third column.
 * A theme whose grid uses other sizes passes them here; see classy-candela/SidebarSection.tsx.
 */
export function SidebarLayout(
  { section, renderSection }: SectionProps<"sidebarSection">,
  {
    sectionClassName = "bg-(--section-bg,var(--color-white)) px-6 py-14 sm:px-10",
    containerClassName = "max-w-7xl",
  }: SidebarLayoutOptions = {},
) {
  const sidebarOnLeft = stegaClean(section.sidebarPosition) === "left";
  const main = section.main ?? [];
  const sidebar = section.sidebar ?? [];

  if (main.length === 0 && sidebar.length === 0) return null;

  // Only one column has anything in it: show it at full width rather than leaving an empty gap.
  if (sidebar.length === 0) return <>{main.map((item) => renderSection(item))}</>;
  if (main.length === 0) return <>{sidebar.map((item) => renderSection(item))}</>;

  return (
    <section className={sectionClassName}>
      <div className={`mx-auto grid grid-cols-1 gap-6 lg:grid-cols-3 ${containerClassName}`}>
        {/* min-w-0 stops wide content (tables, carousels) pushing the column past its share. */}
        <div className={`flex min-w-0 flex-col gap-6 lg:col-span-2 ${sidebarOnLeft ? "lg:order-2" : "lg:order-1"}`}>
          {main.map((item) => renderSection(item))}
        </div>
        <aside className={`flex min-w-0 flex-col gap-6 ${sidebarOnLeft ? "lg:order-1" : "lg:order-2"}`}>
          {sidebar.map((item) => (
            <div key={item._key} className="min-w-0 [&>section]:w-full">
              {renderSection(item, { compact: true })}
            </div>
          ))}
        </aside>
      </div>
    </section>
  );
}

export default function SidebarSection(props: SectionProps<"sidebarSection">) {
  return SidebarLayout(props);
}
