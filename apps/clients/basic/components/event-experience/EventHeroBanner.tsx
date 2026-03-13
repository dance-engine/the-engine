import { EventModelType } from "@dance-engine/schemas/events";
import { OrganisationType } from "@dance-engine/schemas/organisation";
import { OrganisationTheme } from "@/lib/organisationTheme";

export default function EventHeroBanner({
  event,
  org,
  theme,
}: {
  event: EventModelType;
  org: OrganisationType;
  theme: OrganisationTheme;
}) {
  const bannerImage = event.banner || org.banner || "";
  const heroLogo = theme.logoSecondaryUrl || theme.logoUrl;

  return (
    <section className="relative isolate overflow-hidden">
      {bannerImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: `url(${bannerImage})`, opacity: 0.34 }}
        />
      ) : null}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at top left, var(--scheme-overlay-start), transparent 32%), linear-gradient(135deg, var(--scheme-page-bg-start), var(--scheme-overlay-mid) 45%, var(--scheme-overlay-end))`,
        }}
      />
      <div className="relative mx-auto flex min-h-[420px] max-w-7xl items-end justify-between gap-8 px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="max-w-3xl" style={{ color: "var(--scheme-panel-text)" }}>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--scheme-panel-muted)" }}>
            {org.name}
          </p>
          <h1 className="max-w-2xl text-4xl font-black tracking-tight sm:text-5xl lg:text-7xl">
            {event.name}
          </h1>
        </div>

        <div
          className="hidden shrink-0 rounded-[2rem] p-4 shadow-[0_24px_80px_rgba(3,7,18,0.35),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur md:flex"
          style={{ border: `1px solid var(--scheme-surface-border)`, backgroundColor: "var(--scheme-hero-glass)" }}
        >
          {heroLogo ? (
            <img
              src={heroLogo}
              alt={org.name}
              className="h-24 w-24 rounded-[1.35rem] object-contain p-3 shadow-inner lg:h-32 lg:w-32"
              style={{ backgroundColor: "var(--scheme-hero-chip)" }}
            />
          ) : (
            <div
              className="flex h-24 w-24 items-center justify-center rounded-[1.35rem] p-4 text-center text-sm font-bold uppercase tracking-[0.22em] lg:h-32 lg:w-32"
              style={{ backgroundColor: "var(--scheme-hero-chip)", color: "var(--surface-text-color)" }}
            >
              {org.name}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
