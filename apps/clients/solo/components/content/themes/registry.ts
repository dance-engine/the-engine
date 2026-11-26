import defaultTheme from "./default";
import modernEdge from "./modern-edge";
import ruedx from "./ruedx";
import merseysideLatinFestival from "./merseyside-latin-festival";
import type { SoloThemeName } from "@dance-engine/utils/solo-themes";
import type { ResolvedTheme, Theme } from "./types";

// Themes are imported statically (never by a computed path) so a missing theme is a build
// error, not a runtime one. To add a theme:
//   1. define it (name, label, public/private access) in packages/utils/src/solo-themes.ts,
//   2. create themes/<name>/index.ts exporting a Theme with only the sections it changes,
//   3. register it here. Keys must be defined theme names, so a theme missing from
//      solo-themes.ts is a type error.
const themes: Partial<Record<SoloThemeName, Theme>> = {
  "modern-edge": modernEdge,
  ruedx: ruedx,
  "merseyside-latin-festival": merseysideLatinFestival,
};

/** The org's theme merged over the default theme. Unknown or missing names use the default. */
export function resolveTheme(name: string | null | undefined): ResolvedTheme {
  if (!name || name === defaultTheme.name) return defaultTheme;

  const theme = Object.prototype.hasOwnProperty.call(themes, name)
    ? themes[name as SoloThemeName]
    : undefined;
  if (!theme) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`Content theme "${name}" is not registered; using the default theme.`);
    }
    return defaultTheme;
  }

  return {
    name: theme.name,
    Header: theme.Header || defaultTheme.Header,
    PageShell: theme.PageShell || defaultTheme.PageShell,
    sections: { ...defaultTheme.sections, ...theme.sections },
  };
}
