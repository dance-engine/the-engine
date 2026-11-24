import Link from "next/link"
import { headers } from "next/headers"

import { OrganisationType } from "@dance-engine/schemas/organisation"
import { HOME_PAGE_SLUG, getPublishedMenuJumps, getPublishedNavigationPages } from "@/lib/sanity/content"
import { getSanityProjectForOrganisation } from "@/lib/sanity/projects"
import TopLevelNavigation, { type NavigationLink } from "./TopLevelNavigation"

// Single-page sites link to the home page's menu jumps; other sites link to their top-level pages.
async function getNavigationLinks(
  project: NonNullable<Awaited<ReturnType<typeof getSanityProjectForOrganisation>>>,
  singlePageSite: boolean,
): Promise<NavigationLink[]> {
  if (singlePageSite) {
    const jumps = await getPublishedMenuJumps(project, HOME_PAGE_SLUG);
    return jumps.map((jump) => ({ key: jump._key, title: jump.title, href: `/#${jump.anchor}` }));
  }

  const pages = await getPublishedNavigationPages(project);
  return [
    { key: "home", title: "Home", href: "/" },
    ...pages.map((page) => ({ key: page._id, title: page.title, href: `/${page.slug}` })),
  ];
}

const Header = async ({org}:{org: OrganisationType}) => {
  const organisation = (await headers()).get("x-site-org") || "default-org";
  const project = await getSanityProjectForOrganisation(organisation);
  const links = project ? await getNavigationLinks(project, Boolean(org?.single_page_site)) : [];

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
  )
}

export default Header
