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
  if (!project) {
    return (
      <WebsiteUpgradeMessage
        organisation={activeOrg}
        userEmail={user?.primaryEmailAddress?.emailAddress || ""}
        userName={user?.fullName || ""}
      />
    );
  }

  const previewOrigin = await getSanityPreviewOrigin(activeOrg);

  return <div className="h-full min-h-0 overflow-hidden"><ContentStudio {...project} previewOrigin={previewOrigin} /></div>;
}

function SetupMessage({ title, body }: { title: string; body: string }) {
  return <div className="px-4 lg:px-8"><div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-uberdark-background"><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-2 text-gray-600 dark:text-dark-secondary">{body}</p></div></div>;
}

function WebsiteUpgradeMessage({
  organisation,
  userEmail,
  userName,
}: {
  organisation: string;
  userEmail: string;
  userName: string;
}) {
  const subject = encodeURIComponent(`Dance Engine Website enquiry — ${organisation}`);
  const body = encodeURIComponent(
    `Hi Dance Engine,\n\nI'd like to discuss trying Dance Engine Website for ${organisation}.\n\nName: ${userName || "Not provided"}\nEmail: ${userEmail || "Not provided"}\nOrganisation: ${organisation}\n`,
  );

  return (
    <div className="px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-uberdark-background">
        <p className="text-sm font-semibold text-cerise-logo">Dance Engine Website</p>
        <h1 className="mt-2 text-2xl font-semibold">Your current plan doesn&apos;t include a website</h1>
        <p className="mt-3 text-gray-600 dark:text-dark-secondary">
          Add a fully managed website for a small monthly fee. You&apos;ll be able to create pages, arrange content and preview changes here in Dance Engine, while your events stay automatically connected.
        </p>
        <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-white/5">
          <p className="font-semibold">Interested in trying it out?</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-dark-secondary">
            Get in touch with the Dance Engine team to discuss what you need, see how Website could work for your organisation and arrange a trial.
          </p>
          <a
            href={`mailto:root@engine.dance?subject=${subject}&body=${body}`}
            className="mt-4 inline-flex rounded-md bg-cerise-logo px-4 py-2 text-sm font-semibold text-white transition hover:brightness-90"
          >
            Email Dance Engine
          </a>
        </div>
      </div>
    </div>
  );
}
