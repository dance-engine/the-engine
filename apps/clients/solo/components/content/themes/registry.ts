import defaultTheme from "./default";
import modernEdge from "./modern-edge";
import ruedx from "./ruedx";
import type { ResolvedTheme, Theme } from "./types";

// Themes are imported statically (never by a computed path) so a missing theme is a build
// error, not a runtime one. To add a theme: create themes/<name>/index.ts exporting a Theme
// with only the sections it changes, then register it here under the name used in Vercel config.
const themes: Record<string, Theme> = {
  [modernEdge.name]: modernEdge,
  [ruedx.name]: ruedx,
};

/** The org's theme merged over the default theme. Unknown or missing names use the default. */
export function resolveTheme(name: string | null | undefined): ResolvedTheme {
  if (!name || name === defaultTheme.name) return defaultTheme;

  const theme = themes[name];
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
