import type { CSSProperties } from "react";
import Link from "next/link";
import TopLevelNavigation from "@/components/header/TopLevelNavigation";
import { menuColours } from "../default/Header";
import type { HeaderProps } from "../types";

// The default header, plus the org's banner overlay (core app → Settings → Banner overlay) at the
// left edge of the main content column, sitting on the logo band's bottom edge so it touches the menu.
// It's two-thirds of the band's height (set by the logo), and shows at every screen size, behind the logo.
export default function Header({ org, links }: HeaderProps) {
  const colours = menuColours(org);
  // Same fallback TopLevelNavigation uses when the org has no secondary colour.
  const menuBarColour = colours.background ?? "var(--color-keppel-logo)";

  return (
    <header className="relative w-full bg-black text-white">
      <div className="relative flex justify-center">
        {org.banner_overlay && (
          // Same padding and max width as the page sections, so the overlay lines up with the content's left edge.
          // On mobile it runs the full width of the screen instead (clipped at the band's top if it's too tall).
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden md:px-10 border-b-5 border-(--menu-bar) md:border-none"
            style={{ "--menu-bar": menuBarColour } as CSSProperties}
          >
            <div className="relative mx-auto h-full max-w-4xl">
              <img
                src={org.banner_overlay}
                alt=""
                className="absolute bottom-0 left-0 sm:left-24 md:left-0 h-auto w-full
                sm:h-2/3 sm:w-auto sm:max-w-[40%] sm:object-contain sm:object-left-bottom"
              />
            </div>
          </div>
        )}
        {/* z-10 keeps the logo on top where the overlay reaches under it (mostly on mobile). */}
        <div className="relative z-10 max-w-4xl w-4xl px-4 uppercase font-black lg:px-0 py-3">
          <Link href="/" className="flex w-full items-center justify-center">
            {org.logo ? <img src={org.logo} alt={org.name} className="max-w-full w-2/3 sm:w-48" /> : org.name}
          </Link>
        </div>
      </div>
      {links.length > 0 && <TopLevelNavigation links={links} colours={colours} />}
    </header>
  );
}
