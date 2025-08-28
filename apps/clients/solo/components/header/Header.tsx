'use client'
import Link from "next/link"

import { OrganisationType } from "@dance-engine/schemas/organisation"

const Header = ({org}:{org: OrganisationType}) => {
  return (
    <header className='w-full bg-black text-white flex justify-center'>
      <div className='max-w-4xl w-4xl px-4 uppercase font-black lg:px-0 py-3 '>
        <Link href="/" className='block w-full flex items-center justify-center'>{org.logo ? <img src={org.logo} alt={org.name} className='max-w-full w-2/3 sm:w-48'/> : org.name}</Link>
      </div>
    </header>
  )
}

export default Header