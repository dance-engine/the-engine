import { SidebarLayout } from "../default/SidebarSection";
import type { SectionProps } from "../types";

// The default sidebar at classy-candela's grid sizes (./SectionGrid.tsx: py-16, max-w-6xl), so the sidebar
// is as wide as this theme's grid third column. Keep in sync with the grid.
export default function SidebarSection(props: SectionProps<"sidebarSection">) {
  return SidebarLayout(props, {
    sectionClassName: "bg-(--section-bg) px-6 py-16 sm:px-10",
    containerClassName: "max-w-6xl",
  });
}
