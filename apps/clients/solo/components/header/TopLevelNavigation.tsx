"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SanityNavigationPage } from "@/lib/sanity/content";

export default function TopLevelNavigation({ pages }: { pages: SanityNavigationPage[] }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const links = [{ _id: "home", title: "Home", slug: "" }, ...pages];

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
          {links.map((page) => {
            const href = page.slug ? `/${page.slug}` : "/";
            const isCurrent = pathname === href;

            return (
              <li key={page._id}>
                <Link
                  href={href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`block px-4 py-3 text-sm font-semibold transition-colors md:py-2.5 ${
                    isCurrent
                      ? "bg-pear-logo text-slate-950"
                      : "text-white hover:bg-cerise-logo hover:text-slate-950"
                  }`}
                >
                  {page.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
