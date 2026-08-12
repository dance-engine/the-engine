import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { OrganisationType } from "@dance-engine/schemas/organisation";
import Header from "@/components/header/Header";
import DanceEngineFooter from "@/components/footer/DanceEngine";
import SanityPage from "@/components/content/SanityPage";
import { getPublishedContentPage } from "@/lib/sanity/content";
import { getSanityProjectForOrganisation } from "@/lib/sanity/projects";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const [{ slug }, requestHeaders] = await Promise.all([params, headers()]);
  const organisation = requestHeaders.get("x-site-org") || "default-org";
  const project = await getSanityProjectForOrganisation(organisation);
  if (!project) return {};
  const page = await getPublishedContentPage(project, slug);
  return page ? { title: page.title, description: page.seoDescription } : {};
}

export default async function ContentPage({ params }: PageProps) {
  const [{ slug }, requestHeaders] = await Promise.all([params, headers()]);
  const organisation = requestHeaders.get("x-site-org") || "default-org";
  const project = await getSanityProjectForOrganisation(organisation);
  if (!project) notFound();

  const [page, orgResponse] = await Promise.all([
    getPublishedContentPage(project, slug),
    fetch(`${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/public/${organisation}/settings`, {
      next: { revalidate: 30, tags: [`org-settings-${organisation}`] },
    }),
  ]);
  if (!page) notFound();

  const orgData = (await orgResponse.json()) as { organisation?: OrganisationType };
  const org = orgData.organisation || ({ name: "Unknown Organisation", organisation: "unknown-org" } as OrganisationType);

  return (
    <div className="flex min-h-screen flex-col">
      <Header org={org} />
      <div className="flex-1"><SanityPage page={page} project={project} /></div>
      <DanceEngineFooter org={organisation} mode="dark" />
    </div>
  );
}
