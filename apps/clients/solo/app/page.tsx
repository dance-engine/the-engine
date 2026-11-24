export const dynamic = 'force-dynamic';

import { headers } from "next/headers";
import type { Metadata } from "next";
import EventsIndexPage from "./EventsIndexPage";
import {
  HOME_PAGE_SLUG,
  SanityContentRoute,
  getOrganisationSettings,
  getSanityPageMetadata,
} from "@/components/content/SanityContentRoute";

async function getOrganisation() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-site-org") || "default-org";
}

export async function generateMetadata(): Promise<Metadata> {
  const organisation = await getOrganisation();
  const org = await getOrganisationSettings(organisation);
  return org?.single_page_site ? getSanityPageMetadata(organisation, HOME_PAGE_SLUG) : {};
}

// Organisations with single_page_site enabled get their Sanity "home" page at "/".
// Everyone else (setting absent or false) keeps the events landing page.
export default async function IndexPage() {
  const organisation = await getOrganisation();
  const org = await getOrganisationSettings(organisation);

  if (org?.single_page_site) {
    return <SanityContentRoute organisation={organisation} slug={HOME_PAGE_SLUG} org={org} />;
  }

  return <EventsIndexPage />;
}
