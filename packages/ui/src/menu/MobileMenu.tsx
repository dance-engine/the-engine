'use client'
// import Image from "next/image";
import { useMenu } from './MenuContext'
import { MenuClose } from './MenuToggle'
import { MenuProps } from '../types/menu'
// import {usePathname, useRouter, useSearchParams} from 'next/navigation'

const MobileMenu: React.FC<MenuProps> = ({menuContents}: MenuProps) => {
  const { isOpen } = useMenu();

  return (
    <div className={`${isOpen ? "" : "hidden"} relative lg:hidden`} role="dialog" aria-label="Mobile Menu"  style={{zIndex: 1002}} aria-modal="true">

      <div className="fixed inset-0 bg-gray-900/80" aria-hidden="true"></div>

      <div className="fixed inset-0 flex">
      
        <div className="relative mr-16 flex w-full max-w-xs flex-1">

          <div className="absolute left-full top-0 flex w-full h-full justify-center pt-5">
            <MenuClose/>
          </div>
          
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-dark-background px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
              <img className="h-5 w-auto" width={128} height={128} src="/dance-engine-sq.png" alt="Dance Engine - Home"/>
            </div>
            <nav className="flex flex-1 flex-col">
              <ul role="list" className="flex flex-1 flex-col gap-y-7">

              {/* {JSON.stringify(["menu:",menuContents])} */}
                {menuContents?.map((section,idx)=>{
                  return (<li key={`section-${idx}`} className={section.position == 'bottom' ? 'mt-auto': '' }>
                    {section?.name ? <div className="text-xs/6 font-semibold text-primary-text">{section.name}</div> : null }
                    <ul role="list" className="-mx-2 mt-2 space-y-1">
                      {section.contents.map((menuItem,idx)=>{
                        return (<li key={`menu-item-${idx}`}>
                          <a href={menuItem.link} className="group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-primary-text hover:bg-dark-highlight hover:text-white">
                            {menuItem.icon}
                            {menuItem.title}
                          </a>
                        </li>)
                      })}
                    </ul>
                  </li>)
                })}
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
export default MobileMenu;
