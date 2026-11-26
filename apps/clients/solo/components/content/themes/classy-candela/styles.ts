// classy-candela: an evening-salon look. Espresso and cream, wine bands, thin gold rules and an elegant serif.
//
// Colours come from the org's theme (core app → Theme), each falling back to the Candela palette in globals.css:
//   --cc-dark          background dark   hero and events: the big photographic / dark moments
//   --cc-surface-dark  surface dark      header bar, mobile menu and the three-column callout
//   --cc-light         background light  the page
//   --cc-surface-light surface light     FAQ band and grid cards
//   --cc-wine          secondary         the quote and call-to-action bands (never clicked)
//   --cc-action        primary           buttons and links only
//   --cc-gold          theme accent      thin rules, outlines and small caps; not an org colour, it's the theme's signature
//
// Text colour is never chosen by the theme. Each colour above has a "-text" partner: the readable text
// (white or near-black) the core app works out for that colour, so text always comes from what it sits on.
// Sections use the area classes below, which set a background and its text together.
//
// A surface the org hasn't set is its background nudged slightly (darker on the light side, lighter on the dark
// side), so it keeps that background's text. Colours the org hasn't set at all use the Candela palette, with the
// text readableText would give for it.
//
// The header sits outside the page shell, so both apply these variables.
export const candelaColourVariables = [
  "[--cc-dark:var(--org-custom-background-dark,var(--color-candela-espresso))]",
  "[--cc-dark-text:var(--org-custom-background-dark-text,var(--color-white))]",
  "[--cc-light:var(--org-custom-background-light,var(--color-candela-cream))]",
  "[--cc-light-text:var(--org-custom-background-light-text,var(--color-slate-900))]",
  "[--cc-surface-dark:var(--org-custom-surface-dark,color-mix(in_oklab,var(--cc-dark)_90%,var(--color-white)))]",
  "[--cc-surface-dark-text:var(--org-custom-surface-dark-text,var(--cc-dark-text))]",
  "[--cc-surface-light:var(--org-custom-surface-light,color-mix(in_oklab,var(--cc-light)_93%,var(--cc-dark)))]",
  "[--cc-surface-light-text:var(--org-custom-surface-light-text,var(--cc-light-text))]",
  "[--cc-wine:var(--org-custom-secondary,var(--color-candela-wine))]",
  "[--cc-wine-text:var(--org-custom-secondary-text,var(--color-white))]",
  "[--cc-action:var(--org-custom-primary,var(--color-candela-wine))]",
  "[--cc-action-text:var(--org-custom-primary-text,var(--color-white))]",
  "[--cc-gold:var(--color-candela-gold)]",
].join(" ");

// Areas: a background with its own text colour. They also set the --section-* variables, so default sections,
// rich text (.prose, see PageShell) and muted text inside pick up the right colours. --section-muted is
// redefined in each area because a custom property built from another is worked out where it's declared.
export const onLight =
  "bg-(--cc-light) text-(--cc-light-text) [--section-bg:var(--cc-light)] [--section-fg:var(--cc-light-text)] [--section-muted:color-mix(in_srgb,var(--cc-light-text)_72%,transparent)]";
export const onSurfaceLight =
  "bg-(--cc-surface-light) text-(--cc-surface-light-text) [--section-bg:var(--cc-surface-light)] [--section-fg:var(--cc-surface-light-text)] [--section-muted:color-mix(in_srgb,var(--cc-surface-light-text)_72%,transparent)]";
export const onDark =
  "bg-(--cc-dark) text-(--cc-dark-text) [--section-bg:var(--cc-dark)] [--section-fg:var(--cc-dark-text)] [--section-muted:color-mix(in_srgb,var(--cc-dark-text)_78%,transparent)]";
export const onSurfaceDark =
  "bg-(--cc-surface-dark) text-(--cc-surface-dark-text) [--section-bg:var(--cc-surface-dark)] [--section-fg:var(--cc-surface-dark-text)] [--section-muted:color-mix(in_srgb,var(--cc-surface-dark-text)_78%,transparent)]";
export const onWine =
  "bg-(--cc-wine) text-(--cc-wine-text) [--section-bg:var(--cc-wine)] [--section-fg:var(--cc-wine-text)] [--section-muted:color-mix(in_srgb,var(--cc-wine-text)_80%,transparent)]";

/** The short gold line under a heading. Add mx-auto for centred headings. */
export const goldRule = "block h-px w-16 bg-(--cc-gold)";

/** Small, widely spaced capitals: eyebrows, attributions and button labels. */
export const smallCaps = "text-xs font-medium uppercase tracking-[0.3em]";

/** A button on a dark area: gold outline with the area's own text colour, filling with the primary colour on hover. */
export const outlineButtonOnDark =
  "inline-flex items-center border border-(--cc-gold) px-6 py-3 text-sm font-medium uppercase tracking-[0.2em] text-current transition hover:border-(--cc-action) hover:bg-(--cc-action) hover:text-(--cc-action-text)";
