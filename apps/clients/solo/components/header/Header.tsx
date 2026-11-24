import { headers } from "next/headers"

import { OrganisationType } from "@dance-engine/schemas/organisation"
import { resolveTheme } from "@/components/content/themes/registry"
import { HOME_PAGE_SLUG, getPublishedMenuJumps, getPublishedNavigationPages } from "@/lib/sanity/content"
import { getSanityProjectForOrganisation } from "@/lib/sanity/projects"
import type { NavigationLink } from "./TopLevelNavigation"

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

// Loads the header's data, then renders it with the org's theme (set by middleware from Vercel config).
const Header = async ({org}:{org: OrganisationType}) => {
  const requestHeaders = await headers();
  const organisation = requestHeaders.get("x-site-org") || "default-org";
  const requestedTheme = requestHeaders.get("x-site-theme") || "default";
  const theme = resolveTheme(requestedTheme);
  const project = await getSanityProjectForOrganisation(organisation);
  const links = project ? await getNavigationLinks(project, Boolean(org?.single_page_site)) : [];

  return <>
    {process.env.NODE_ENV === "development" && (
      <div className="w-full bg-neutral-50 px-2 py-px text-center font-mono text-[10px] leading-tight text-neutral-800">
        theme: {theme.name}
        {theme.name !== requestedTheme && ` (requested "${requestedTheme}" is not registered)`}
        {" · "}org: {organisation}
      </div>
    )}
    <theme.Header org={org} links={links} />
  </>
}

export default Header
