import Link from "next/link";
import TopLevelNavigation from "@/components/header/TopLevelNavigation";
import type { NavigationColours } from "@/components/header/TopLevelNavigation";
import { getOrganisationTheme, readableText } from "@dance-engine/ui/event/lib/organisationTheme";
import type { HeaderProps } from "../types";

// Menu colours come from the org's theme in the core app (Settings → Theme):
// secondary is the menu bar; primary is for interaction (the hover block and the mobile menu button).
// Text picks white or near-black for contrast. Orgs without theme colours get the shared defaults
// from getOrganisationTheme.
function menuColours(org: HeaderProps["org"]): NavigationColours {
  const { primary, secondary } = getOrganisationTheme(org);
  return {
    background: secondary,
    text: readableText(secondary),
    hoverBackground: primary,
    hoverText: readableText(primary),
    buttonBackground: primary,
    buttonText: readableText(primary),
  };
}

// Logo aligned left, with the black band and menu skewed so they slope down to the left.
// The slope is drawn with transforms, which don't change the layout box, so the sloped part
// sits over the top of the next element instead of leaving an empty triangle.
//
// Both layers use the same skew with the origin on the right, so the right-hand edge stays put,
// every point moves down by (distance from the right) × tan(angle), and the layers stay joined.
// Keep the two skew-y values in sync.
export default function Header({ org, links }: HeaderProps) {
  return (
    <header className="relative z-30 w-full text-white">
      <div className="relative flex justify-center">
        {/* Extends upwards (-top-[10vw]) so the skew never pulls the top edge into view. */}
        {/* -bottom-1 runs the black 4px under the menu, so the menu's anti-aliased top edge
            blends into black instead of showing a light seam. */}
        <div aria-hidden="true" className="absolute inset-x-0 -top-[10vw] -bottom-1 origin-right -skew-y-[2.5deg] bg-black" />
        <div className="relative max-w-6xl w-full px-4 uppercase font-black md:px-0 py-3">
          <Link href="/" className="flex w-full items-center justify-center md:justify-start">
            {org.logo ? <img src={org.logo} alt={org.name} className="max-w-full md:w-32 md:ml-10 w-16" /> : org.name}
          </Link>
        </div>
      </div>
      {/* Desktop only: on mobile the menu is an absolutely positioned button + dropdown, so it stays upright. */}
      {links.length > 0 && (
        <div className="md:origin-right md:-skew-y-[2.5deg]">
          <TopLevelNavigation links={links} colours={menuColours(org)} textSizeClassName="text-base md:text-lg"
            // Undo the wrapper's skew, then rotate by the same angle, so the words are written along the
            // slope without being distorted. One transform list keeps the order exact (skew-y-* and
            // rotate-* are separate CSS properties and would apply the other way round).
            labelClassName="md:[transform:skewY(2.5deg)_rotate(-2.5deg)]"
          />
        </div>
      )}
    </header>
  );
}
