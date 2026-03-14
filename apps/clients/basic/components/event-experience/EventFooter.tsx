import Image from "next/image";
import Link from "next/link";
import { OrganisationType } from "@dance-engine/schemas/organisation";
import { OrganisationTheme } from "@/lib/organisationTheme";

export default function EventFooter({
  org,
  theme,
}: {
  org: OrganisationType;
  theme: OrganisationTheme;
}) {
  return (
    <footer className="mt-20" style={{ color: "var(--scheme-panel-text)" }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div className="flex flex-col gap-3 text-sm" style={{ color: "var(--scheme-panel-muted)" }}>
          <div className="flex gap-4">
            <Link href="https://www.danceengine.co.uk/tos" className="transition hover:text-white">
              Terms of Service
            </Link>
            <Link href="https://www.danceengine.co.uk/privacy" className="transition hover:text-white">
              Privacy Policy
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--scheme-panel-muted)" }}>
            Tickets powered by
          </p>
          <Link href={`https://danceengine.co.uk?src=event_footer&org=${org.organisation}`}>
            <Image
              src="/dance-engine-logo.png"
              width={220}
              height={24}
              alt="Dance Engine"
              className="mt-3 h-auto w-[220px]"
            />
          </Link>
        </div>

        <div className="text-sm lg:text-right" style={{ color: "var(--scheme-panel-muted)" }}>
          {/* TODO Put in contact email of the organisation */}
          <Link href="/" className="transition hover:text-white">
            Contact {org.name}
          </Link>
        </div>
      </div>
    </footer>
  );
}
