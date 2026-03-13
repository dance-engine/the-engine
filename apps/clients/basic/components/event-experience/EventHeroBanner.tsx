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
  const foregroundColour = bannerImage ? "var(--scheme-panel-text)" : "var(--scheme-page-text)";
  const mutedColour = bannerImage ? "var(--scheme-panel-muted)" : "var(--scheme-page-text-muted)";

  return (
    <section className="relative isolate overflow-hidden">
      {bannerImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bannerImage})` }}
        />
      ) : null}
      {bannerImage ? (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, color-mix(in srgb, var(--org-color-primary-dark) 82%, transparent) 0%, color-mix(in srgb, var(--org-color-background) 46%, transparent) 55%, color-mix(in srgb, var(--org-color-primary-dark) 72%, transparent) 100%)`,
          }}
        />
      ) : null}
      <div
        className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${
          bannerImage ? "flex min-h-[360px] items-end py-14 lg:min-h-[400px] lg:py-16" : "py-10 lg:py-12"
        }`}
      >
        <div className="flex w-full items-end justify-between gap-8">
          <div className="max-w-3xl" style={{ color: foregroundColour }}>
            <p className="mb-3 text-sm font-semibold tracking-tight sm:text-base" style={{ color: mutedColour }}>
              {org.name}
            </p>
            <h1 className="max-w-2xl text-4xl font-black tracking-tight sm:text-5xl lg:text-7xl">
              {event.name}
            </h1>
          </div>

          {heroLogo ? (
            <div className="hidden w-full max-w-[240px] shrink-0 justify-end md:flex lg:max-w-[300px]">
              <img
                src={heroLogo}
                alt={org.name}
                className="h-auto max-h-[220px] w-full object-contain drop-shadow-[0_14px_35px_rgba(0,0,0,0.28)]"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
