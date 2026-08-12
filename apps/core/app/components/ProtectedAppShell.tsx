"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LuArrowLeft, LuPanelsTopLeft } from "react-icons/lu";
import MainMenu from "@dance-engine/ui/menu/MainMenu";
import MobileMenu from "@dance-engine/ui/menu/MobileMenu";
import { MenuToggle } from "@dance-engine/ui/menu/MenuToggle";
import ProfileControl from "@dance-engine/ui/ProfileControl";
import { CurrentOrganisation } from "@dance-engine/ui/CurrentOrganisation";
import { useOrgContext } from "@dance-engine/utils/OrgContext";
import type { MenuSection } from "../../../../packages/ui/src/types/menu";
import { LayoutSearchProvider } from "./LayoutSearchContext";
import LayoutSearchInput from "./LayoutSearchInput";

export default function ProtectedAppShell({
  children,
  menuContents,
}: {
  children: React.ReactNode;
  menuContents: MenuSection[];
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/content")) {
    return <WebsiteShell>{children}</WebsiteShell>;
  }

  return (
    <LayoutSearchProvider minChars={3} debounceMs={500}>
      <div>
        <MobileMenu menuContents={menuContents} />
        <MainMenu menuContents={menuContents} />
        <div className="min-[1150px]:pl-48">
          <div className="sticky top-0 z-40">
            <CurrentOrganisation variant="mobile" />
            <header className="flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm dark:bg-uberdark-background sm:gap-x-6 sm:px-6 min-[1150px]:px-8">
              <MenuToggle />
              <div className="h-6 w-px bg-gray-900/10 min-[1150px]:hidden" aria-hidden="true" />
              <div className="flex flex-1 gap-x-4 self-stretch min-[1150px]:gap-x-6">
                <form className="grid flex-1 grid-cols-1" method="GET">
                  <LayoutSearchInput />
                  <svg className="pointer-events-none col-start-1 row-start-1 size-5 self-center text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                  </svg>
                </form>
                <ProfileControl />
              </div>
            </header>
          </div>
          <main className="py-4 sm:py-6 min-[1150px]:py-10">{children}</main>
        </div>
      </div>
    </LayoutSearchProvider>
  );
}

function WebsiteShell({ children }: { children: React.ReactNode }) {
  const { activeOrg, isLoaded } = useOrgContext();

  return (
    <div className="flex h-dvh overflow-hidden flex-col bg-[#000522]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-[#01164d] px-3 text-white sm:px-4">
        <Link href="/" className="flex size-9 items-center justify-center rounded-md text-white/80 transition hover:bg-white/10 hover:text-white" aria-label="Return to Dance Engine">
          <LuArrowLeft className="size-5" />
        </Link>
        <Image src="/dance-engine-logo-wide.png" width={116} height={32} alt="Dance Engine" className="hidden h-auto w-24 sm:block" />
        <div className="h-6 w-px bg-white/15" />
        <LuPanelsTopLeft className="size-5 text-keppel-logo" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">Website content</div>
          <div className="truncate text-xs text-white/60">
            {isLoaded ? activeOrg || "No organisation selected" : "Loading organisation…"}
          </div>
        </div>
        <Link href="/" className="hidden rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white sm:block">
          Back to Core
        </Link>
        <ProfileControl />
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
