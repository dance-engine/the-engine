import Image from "next/image";
import Link from "next/link";
import { OrganisationType } from "@dance-engine/schemas/organisation";
import { OrganisationTheme } from "./lib/organisationTheme";

export default function EventFooter({
  org,
  theme,
}: {
  org: OrganisationType;
  theme: OrganisationTheme;
}) {
  return (
    <footer className="mt-20" style={{ color: "white", background: "#01164D" }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div
          className="flex flex-col gap-3 text-sm"
          style={{ color: "white" }}
        >
          <div className="flex gap-4">
            <Link
              href="https://www.danceengine.co.uk/tos"
              className="transition hover:opacity-70"
            >
              Terms of Service
            </Link>
            <Link
              href="https://www.danceengine.co.uk/privacy"
              className="transition hover:opacity-70"
            >
              Privacy Policy
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <p
            className="text-xs font-semibold uppercase tracking-[0.28em]"
            style={{ color: "white" }}
          >
            Tickets powered by
          </p>
          <Link
            href={`https://danceengine.co.uk?src=event_footer&org=${org.organisation}`}
          >
            <Image
              src="/dance-engine-logo.png"
              width={220}
              height={24}
              alt="Dance Engine"
              className="mt-3 h-auto w-[220px]"
            />
          </Link>
        </div>

        <div
          className="text-sm lg:text-right"
          style={{ color: "white" }}
        >
          <Link href="/" className="cursor-pointer transition hover:opacity-70">
            Contact {org.name}
          </Link>
        </div>
      </div>
    </footer>
  );
}
