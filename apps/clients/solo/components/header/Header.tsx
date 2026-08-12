import Link from "next/link"
import { headers } from "next/headers"

import { OrganisationType } from "@dance-engine/schemas/organisation"
import { getPublishedNavigationPages } from "@/lib/sanity/content"
import { getSanityProjectForOrganisation } from "@/lib/sanity/projects"
import TopLevelNavigation from "./TopLevelNavigation"

const Header = async ({org}:{org: OrganisationType}) => {
  const organisation = (await headers()).get("x-site-org") || "default-org";
  const project = await getSanityProjectForOrganisation(organisation);
  const pages = project ? await getPublishedNavigationPages(project) : [];

  return (
    <header className='w-full bg-black text-white'>
      <div className="flex justify-center">
        <div className='max-w-4xl w-4xl px-4 uppercase font-black lg:px-0 py-3 '>
          {
            org?.organisation != 'rebel-sbk' ?
              <Link href="/" className='block w-full flex items-center justify-center'>{org.logo ? <img src={org.logo} alt={org.name} className='max-w-full w-2/3 sm:w-48'/> : org.name}</Link>
              : null
          }
        </div>
      </div>
      <TopLevelNavigation pages={pages} />
    </header>
  )
}

export default Header
