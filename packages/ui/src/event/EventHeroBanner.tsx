import { EventModelType } from "@dance-engine/schemas/events";
import { OrganisationType } from "@dance-engine/schemas/organisation";
import { OrganisationTheme } from "./lib/organisationTheme";

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
  const legacyHero = org.organisation === "rebel-sbk" ;
  const foregroundColour = bannerImage
    ? "var(--scheme-hero-text)"
    : "var(--scheme-page-text)";
  const mutedColour = bannerImage
    ? "var(--scheme-hero-muted)"
    : "var(--scheme-page-text-muted)";

  return (
    <section className="relative isolate overflow-hidden">
      {bannerImage ? (
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url(${bannerImage})` }}
        />
      ) : null}
      {bannerImage && !legacyHero ? (
        <div
          className="absolute inset-0"
          style={{ background: "var(--scheme-hero-overlay)" }}
        />
      ) : null}
      <div
        className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${
          bannerImage
            ? "flex min-h-[320px] items-end py-12 lg:min-h-[360px] lg:py-14"
            : "py-8 lg:py-10"
        }`}
      >
        <div className="flex w-full items-end justify-between gap-8">
          {!legacyHero ? <div className="max-w-3xl" style={{ color: foregroundColour }}>
            <p
              className="mb-2 text-sm font-semibold tracking-tight sm:text-base"
              style={{ color: mutedColour }}
            >
              {org.name}
            </p>
            <h1 className="max-w-2xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              {event.name}
            </h1>
          </div> : null }

          {heroLogo && /^https\:\/\//.test(heroLogo) ? (
            <div className="hidden w-full max-w-[200px] shrink-0 justify-end md:flex lg:max-w-[240px]">
              <img
                src={heroLogo}
                alt={org.name}
                className="h-auto max-h-[180px] w-full object-contain"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
