import Link from "next/link";
import TopLevelNavigation from "@/components/header/TopLevelNavigation";
import type { NavigationColours } from "@/components/header/TopLevelNavigation";
import { readableText } from "@dance-engine/ui/event/lib/organisationTheme";
import { orgCustomColours } from "../shared";
import type { HeaderProps } from "../types";

// Uses the org's theme colours when it has set them: secondary for the menu bar, primary for the
// hover block and mobile menu button. Anything not set keeps TopLevelNavigation's own colours.
export function menuColours(org: HeaderProps["org"]): NavigationColours {
  const { primary, secondary } = orgCustomColours(org);
  return {
    background: secondary,
    text: secondary && readableText(secondary),
    hoverBackground: primary,
    hoverText: primary && readableText(primary),
    buttonBackground: primary,
    buttonText: primary && readableText(primary),
  };
}

export default function Header({ org, links }: HeaderProps) {
  return (
    <header className='relative w-full bg-black text-white'>
      <div className="flex justify-center">
        <div className='max-w-4xl w-4xl px-4 uppercase font-black lg:px-0 py-3 '>
          {
            org?.organisation != 'rebel-sbk' && org?.organisation != 'merseyside-latin-festival' ?
              <Link href="/" className='block w-full flex items-center justify-center'>{org.logo ? <img src={org.logo} alt={org.name} className='max-w-full w-2/3 sm:w-48'/> : org.name}</Link>
              : null
          }
        </div>
      </div>
      {links.length > 0 && <TopLevelNavigation links={links} colours={menuColours(org)} />}
    </header>
  );
}
