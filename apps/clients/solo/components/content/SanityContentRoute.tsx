import "server-only";

import { draftMode, headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { getOrganisationTheme, readableText } from "@dance-engine/ui/event/lib/organisationTheme";
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
  // Set by middleware from the org→theme map in Vercel edge config ("default" when none is set).
  const theme = (await headers()).get("x-site-theme");

  // The org's theme colours (core app → Settings → Theme) as CSS variables, so header and section
  // components can use them in classes, e.g. hover:bg-(--org-color-primary).
  const orgTheme = getOrganisationTheme(org);
  const orgColourVariables = {
    "--org-color-primary": orgTheme.primary,
    "--org-color-primary-text": readableText(orgTheme.primary),
    "--org-color-secondary": orgTheme.secondary,
    "--org-color-secondary-text": readableText(orgTheme.secondary),
  } as CSSProperties;

  return (
    <div className="flex min-h-screen flex-col" style={orgColourVariables}>
      <Header org={org} />
      <div className="flex-1"><SanityPage page={page} project={project} organisation={organisation} theme={theme} /></div>
      <DanceEngineFooter org={organisation} mode="dark" />
    </div>
  );
}
