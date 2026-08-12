import { currentUser } from "@clerk/nextjs/server";
import ContentStudio from "./Studio";
import {
  getSanityPreviewOrigin,
  getSanityProjectForOrganisation,
} from "../../lib/sanity/projects";

export default async function ContentPage() {
  const user = await currentUser();
  const organisations = Object.keys(user?.publicMetadata.organisations || {});
  const requestedOrg = typeof user?.publicMetadata.lastOrg === "string" ? user.publicMetadata.lastOrg : null;
  const activeOrg = requestedOrg && (organisations.includes(requestedOrg) || organisations.includes("*"))
    ? requestedOrg
    : organisations.length === 1 && organisations[0] !== "*" ? organisations[0] : null;
  const project = await getSanityProjectForOrganisation(activeOrg);

  if (!activeOrg) return <SetupMessage title="Select an organisation" body="Choose an organisation before opening website content." />;
  if (!project) return <SetupMessage title="Website content is not enabled" body={`${activeOrg} does not have a Sanity project configured yet.`} />;

  const previewOrigin = await getSanityPreviewOrigin(activeOrg);

  return <div className="h-full min-h-0 overflow-hidden"><ContentStudio {...project} previewOrigin={previewOrigin} /></div>;
}

function SetupMessage({ title, body }: { title: string; body: string }) {
  return <div className="px-4 lg:px-8"><div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-uberdark-background"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-gray-600 dark:text-dark-secondary">{body}</p></div></div>;
}
