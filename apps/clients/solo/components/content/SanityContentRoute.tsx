import "server-only";

import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { OrganisationType } from "@dance-engine/schemas/organisation";
import Header from "@/components/header/Header";
import DanceEngineFooter from "@/components/footer/DanceEngine";
import SanityPage from "@/components/content/SanityPage";
import { getPreviewContentPage, getPublishedContentPage } from "@/lib/sanity/content";
import {
  getSanityPreviewToken,
  getSanityProjectForOrganisation,
  getSanityStudioUrl,
} from "@/lib/sanity/projects";

export { HOME_PAGE_SLUG } from "@/lib/sanity/content";

export async function getOrganisationSettings(organisation: string): Promise<OrganisationType | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${organisation}/settings`, {
      next: { revalidate: 30, tags: [`org-settings-${organisation}`] },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { organisation?: OrganisationType };
    return data.organisation || null;
  } catch {
    return null;
  }
}

export async function getSanityPageMetadata(organisation: string, slug: string): Promise<Metadata> {
  const project = await getSanityProjectForOrganisation(organisation);
  if (!project) return {};
  const page = await getPublishedContentPage(project, slug);
  return page ? { title: page.title, description: page.seoDescription } : {};
}

export async function SanityContentRoute({
  organisation,
  slug,
  org: preloadedOrg,
}: {
  organisation: string;
  slug: string;
  org?: OrganisationType | null;
}) {
  const project = await getSanityProjectForOrganisation(organisation);
  if (!project) notFound();

  const draftModeStore = await draftMode();
  const previewToken = draftModeStore.isEnabled
    ? getSanityPreviewToken(project.projectId)
    : null;
  const studioUrl = draftModeStore.isEnabled ? getSanityStudioUrl() : null;
  if (draftModeStore.isEnabled && (!previewToken || !studioUrl)) {
    throw new Error(`Sanity preview is not fully configured for project ${project.projectId}`);
  }

  const [page, fetchedOrg] = await Promise.all([
    previewToken
      ? getPreviewContentPage(project, slug, previewToken, studioUrl!)
      : getPublishedContentPage(project, slug),
    preloadedOrg === undefined ? getOrganisationSettings(organisation) : Promise.resolve(preloadedOrg),
  ]);
  if (!page) notFound();

  const org = fetchedOrg || ({ name: "Unknown Organisation", organisation: "unknown-org" } as OrganisationType);

  return (
    <div className="flex min-h-screen flex-col">
      <Header org={org} />
      <div className="flex-1"><SanityPage page={page} project={project} /></div>
      <DanceEngineFooter org={organisation} mode="dark" />
    </div>
  );
}
