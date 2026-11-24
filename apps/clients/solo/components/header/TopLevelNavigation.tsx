"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type NavigationLink = { key: string; title: string; href: string };

export default function TopLevelNavigation({ links }: { links: NavigationLink[] }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => setIsOpen(false), [pathname]);

  return (
    <nav
      className="absolute right-0 top-0 z-40 text-white md:static md:w-full md:bg-keppel-logo"
      aria-label="Website"
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-website-menu"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        onClick={() => setIsOpen((open) => !open)}
        className="flex size-12 items-center justify-center bg-keppel-logo transition hover:bg-cerise-logo hover:text-slate-950 md:hidden"
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
        className={`${isOpen ? "block" : "hidden"} absolute right-0 top-12 w-64 bg-keppel-logo md:static md:block md:w-full`}
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
                  className={`block px-4 py-3 text-sm font-semibold transition-colors md:py-2.5 ${
                    isCurrent
                      ? "bg-pear-logo text-slate-950"
                      : "text-white hover:bg-cerise-logo hover:text-slate-950"
                  }`}
                >
                  {link.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
