import Link from "next/link";
import TopLevelNavigation from "@/components/header/TopLevelNavigation";
import type { HeaderProps } from "../types";
import { candelaColourVariables, onSurfaceDark } from "./styles";

// A slim espresso bar: logo (or the org's name in spaced serif capitals) on the left, links on the right.
// No hover blocks; links turn gold on hover and the current page gets a thin gold underline.
export default function Header({ org, links }: HeaderProps) {
  const logoSrc = org.logo_icon_url || org.logo;

  return (
    // Surface dark, so the bar sits as a separate band above the hero's darker background.
    <header className={`${candelaColourVariables} ${onSurfaceDark} w-full border-b border-(--cc-gold)/25`}>
      {/* relative + h-20: the mobile menu button (absolute, top right, 48px) sits inside the bar. */}
      <div className="relative mx-auto flex h-20 max-w-6xl items-center gap-8 px-6 sm:px-10 xl:px-0">
        <Link href="/" className="shrink-0">
          {logoSrc ? (
            <img src={logoSrc} alt={org.name} className="h-10 w-auto" />
          ) : (
            <span className="font-classy text-2xl uppercase tracking-[0.18em]">{org.name}</span>
          )}
        </Link>
        {links.length > 0 && (
          <div className="ml-auto md:flex-1 [&_nav]:top-4 [&_nav]:right-4 md:[&_nav]:right-auto">
            <TopLevelNavigation
              links={links}
              align="end"
              textSizeClassName="text-sm md:text-base md:font-normal"
              // The underline goes on the label span (*:), as an underline on the link doesn't reach into its inline-block label.
              currentClassName="text-(--menu-fg) *:underline *:decoration-(--cc-gold) *:decoration-1 *:underline-offset-8"
              colours={{
                background: "var(--cc-surface-dark)",
                text: "var(--cc-surface-dark-text)",
                hoverBackground: "transparent",
                hoverText: "var(--cc-gold)",
                buttonBackground: "var(--cc-surface-dark)",
                buttonText: "var(--cc-gold)",
              }}
            />
          </div>
        )}
      </div>
    </header>
  );
}
