import type { Theme } from "../types";

// Starting point for a new theme. As it stands it changes nothing: anything left out of the theme
// object falls back to the default theme. See "Themes" in docs/WebsiteSetup.md for the full steps.
//
// 1. Copy this folder to themes/<name>/ and set `name` below.
// 2. For each part you want to change, copy that file from themes/default/ into this folder, edit
//    the copy, and import it here, e.g.
//
//      import Header from "./Header";
//      import HeroSection from "./HeroSection";
//
// 3. Register the theme in themes/registry.ts, and assign it to the org in Edge Config.

const template = {
  name: "template",

  // Site header. Props: HeaderProps ({ org, links }). See themes/ruedx/Header.tsx for an example.
  // Header,

  // Wraps every page's sections: page-wide background, text colour or fonts. Props: PageShellProps ({ children }).
  // PageShell,

  // One component per Sanity section type, keyed by the type name. Props: SectionProps<"<type>">,
  // e.g. SectionProps<"heroSection">. The full list of keys is in themes/default/index.ts.
  // Keep data logic in ../shared.ts and only change layout and styling here.
  sections: {
    // heroSection: HeroSection,
    // callToActionSection: CallToActionSection,
  },
} satisfies Theme;

export default template;
