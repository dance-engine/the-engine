"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";

export type NavigationLink = { key: string; title: string; href: string };

export type NavigationColours = {
  /** Menu background: any CSS colour, e.g. "var(--color-sky-300)" or "#4de1ff". */
  background?: string;
  /** Link and icon colour on that background. */
  text?: string;
  /** Hover block colour behind a link (and the mobile menu button). */
  hoverBackground?: string;
  /** Text colour on the hover block. */
  hoverText?: string;
  /** Mobile menu button colour. Defaults to the menu background. */
  buttonBackground?: string;
  /** Icon colour on the mobile menu button. Defaults to the menu text colour. */
  buttonText?: string;
};

type TopLevelNavigationProps = {
  links: NavigationLink[];
  /** Defaults to the keppel menu with white text. */
  colours?: NavigationColours;
  /** Text size class for the links. */
  textSizeClassName?: string;
  /** Extra classes on each link's label (an inline-block span), e.g. to counter a theme's skew. */
  labelClassName?: string;
};

export default function TopLevelNavigation({
  links,
  colours,
  textSizeClassName = "text-sm",
  labelClassName = "",
}: TopLevelNavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => setIsOpen(false), [pathname]);

  // Colours are passed down as CSS variables so the classes below stay static for Tailwind.
  const colourVariables = {
    "--menu-bg": colours?.background ?? "var(--color-keppel-logo)",
    "--menu-fg": colours?.text ?? "var(--color-white)",
    "--menu-hover-bg": colours?.hoverBackground ?? "var(--color-cerise-logo)",
    "--menu-hover-fg": colours?.hoverText ?? "var(--color-slate-950)",
    "--menu-button-bg": colours?.buttonBackground ?? "var(--menu-bg)",
    "--menu-button-fg": colours?.buttonText ?? "var(--menu-fg)",
  } as CSSProperties;

  return (
    <nav
      style={colourVariables}
      className="absolute right-0 top-0 z-40 text-(--menu-fg) md:static md:w-full md:bg-(--menu-bg)"
      aria-label="Website"
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-website-menu"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        onClick={() => setIsOpen((open) => !open)}
        className="flex size-12 items-center justify-center bg-(--menu-button-bg) text-(--menu-button-fg) transition hover:bg-(--menu-hover-bg) hover:text-(--menu-hover-fg) md:hidden"
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6" aria-hidden="true">
            <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-6" aria-hidden="true">
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      <div
        id="mobile-website-menu"
        className={`${isOpen ? "block" : "hidden"} absolute right-0 top-12 w-64 bg-(--menu-bg) md:static md:block md:w-full`}
      >
        <ul className="flex flex-col md:flex-row md:items-stretch md:justify-center">
          {links.map((link) => {
            const isCurrent = pathname === link.href;

            return (
              <li key={link.key}>
                <Link
                  href={link.href}
                  // Same-page #anchor links don't change the pathname, so close the mobile menu here too.
                  onClick={() => setIsOpen(false)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`block px-4 py-3 ${textSizeClassName} font-semibold transition-colors md:py-2.5 ${
                    isCurrent
                      ? "bg-pear-logo text-slate-950"
                      : "text-(--menu-fg) hover:bg-(--menu-hover-bg) hover:text-(--menu-hover-fg)"
                  }`}
                >
                  <span className={`inline-block ${labelClassName}`}>{link.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
