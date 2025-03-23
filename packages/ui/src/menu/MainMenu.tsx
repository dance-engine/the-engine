import Image from "next/image";
import { MenuProps } from '../types/menu'

export const MainMenu: React.FC<MenuProps> = ({menuContents, orgSelector }: MenuProps) => {
  return (<nav className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-row">
          
    <div className="flex grow flex-col gap-y-0 overflow-y-auto bg-dark-background px-6 pb-4">
      <div className="flex h-16 shrink-0 items-center">
        <Image className="h-5 w-auto" width={1354} height={128} src="/dance-engine-logo-wide.png" alt="Dance Engine - Home"/>
      </div>
      {orgSelector ? orgSelector : null}
      <div className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
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
      </div>
    </div>
  </nav>)
}

export default MainMenu