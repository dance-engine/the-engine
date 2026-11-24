import Link from "next/link";
import TopLevelNavigation from "@/components/header/TopLevelNavigation";
import type { HeaderProps } from "../types";

export default function Header({ org, links }: HeaderProps) {
  return (
    <header className='relative w-full bg-black text-white'>
      <div className="flex justify-center">
        <div className='max-w-4xl w-4xl px-4 uppercase font-black lg:px-0 py-3 '>
          {
            org?.organisation != 'rebel-sbk' ?
              <Link href="/" className='block w-full flex items-center justify-center'>{org.logo ? <img src={org.logo} alt={org.name} className='max-w-full w-2/3 sm:w-48'/> : org.name}</Link>
              : null
          }
        </div>
      </div>
      {links.length > 0 && <TopLevelNavigation links={links} />}
    </header>
  );
}
