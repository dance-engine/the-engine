"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SanityNavigationPage } from "@/lib/sanity/content";

export default function TopLevelNavigation({ pages }: { pages: SanityNavigationPage[] }) {
  const pathname = usePathname();

  return (
    <nav className="w-full border-t border-white/10 bg-black text-white" aria-label="Website">
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-1 gap-y-1 px-4 py-2">
        <li>
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={`block rounded-md px-3 py-2 text-sm font-semibold transition ${
              pathname === "/"
                ? "bg-keppel-on-light text-white"
                : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            Home
          </Link>
        </li>
        {pages.map((page) => {
          const href = `/${page.slug}`;
          const isCurrent = pathname === href;

          return (
            <li key={page._id}>
              <Link
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={`block rounded-md px-3 py-2 text-sm font-semibold transition ${
                  isCurrent
                    ? "bg-keppel-on-light text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                }`}
              >
                {page.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
