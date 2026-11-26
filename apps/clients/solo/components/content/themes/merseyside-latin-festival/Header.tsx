import type { CSSProperties } from "react";
import Link from "next/link";
import TopLevelNavigation from "@/components/header/TopLevelNavigation";
import { readableText } from "@dance-engine/ui/event/lib/organisationTheme";
import { menuColours } from "../default/Header";
import { orgCustomColours } from "../shared";
import type { HeaderProps } from "../types";

// mlf header: a single bar with a small logo on the left and the menu links on the right.
// The bar uses the org's light background colour (core app → Settings → Theme) when the browser is
// in light mode and its dark background colour in dark mode, each with a readable text colour.
// A colour the org hasn't set falls back to the default header's menu colour.
export default function Header({ links, org }: HeaderProps) {
  const { primary, backgroundLight, backgroundDark } = orgCustomColours(org);
  const defaults = menuColours(org);
  const fallbackBackground = defaults.background ?? "var(--color-keppel-logo)";
  const fallbackText = defaults.text ?? "var(--color-white)";
  const logoSrc = org.logo_icon_url || org.logo;

  // Both modes' colours are set as variables here; the classes on <header> pick one per mode,
  // and the menu reads the picked one through --mlf-menu-bg / --mlf-menu-fg.
  const modeColours = {
    "--mlf-menu-bg-light": backgroundLight ?? fallbackBackground,
    "--mlf-menu-fg-light": backgroundLight ? readableText(backgroundLight) : fallbackText,
    "--mlf-menu-bg-dark": backgroundDark ?? fallbackBackground,
    "--mlf-menu-fg-dark": backgroundDark ? readableText(backgroundDark) : fallbackText,
    "--mlf-current": primary ?? "#ed1c24",
  } as CSSProperties;

  return (
    <header
      style={modeColours}
      className="w-full bg-(--mlf-menu-bg) text-(--mlf-menu-fg) [--mlf-menu-bg:var(--mlf-menu-bg-light)] [--mlf-menu-fg:var(--mlf-menu-fg-light)] dark:[--mlf-menu-bg:var(--mlf-menu-bg-dark)] dark:[--mlf-menu-fg:var(--mlf-menu-fg-dark)]"
    >
      {/* One bar, the same width as the page content: small logo on the left, links on the right.
          relative + h-12 so the mobile menu button (absolute, top right, 48px square) sits inside the bar. */}
      <div className="relative mx-auto flex h-20 max-w-4xl items-center gap-6 px-4 lg:px-0">
        {/* Icon logo (core app → Settings → Logo icon) if set, else the main logo, else nothing. */}
        {logoSrc && (
          <Link href="/" className="shrink-0">
            <img src={logoSrc} alt={org.name} className="h-8 w-auto" />
          </Link>
        )}
        {links.length > 0 && (
          <TopLevelNavigation
            links={links}
            align="end"
            textSizeClassName="text-base md:text-lg"
            // Current page: red underline (the org's primary colour) instead of the default highlight block.
            // The underline goes on the label span (*:), because an underline on the link doesn't reach
            // into its inline-block label.
            currentClassName="text-(--menu-fg) hover:bg-(--menu-hover-bg) hover:text-(--menu-hover-fg) *:underline *:decoration-(--mlf-current) *:decoration-2 *:underline-offset-8"
            colours={{ ...defaults, background: "var(--mlf-menu-bg)", text: "var(--mlf-menu-fg)" }}
          />
        )}
      </div>
    </header>
  );
}
