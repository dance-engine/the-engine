/**
 * Solo site theme definitions: the single source of truth for which themes exist
 * and who may use them. Data only (no React), so both the solo client and core can import it.
 *
 * Which theme an org is *currently* on lives in Edge Config (`solo.themes`). This file decides
 * which themes an org is *allowed* to pick.
 *
 * To add a theme: add an entry here, then (for content themes) build it in
 * apps/clients/solo/components/content/themes/<name> and register it in registry.ts.
 *
 * Access:
 *   public  — any organisation can choose it.
 *   private — only the organisations listed in `orgs` can choose it.
 * Super admins can assign any theme to any organisation regardless of access.
 */

export type SoloThemeAccess =
  | { visibility: "public" }
  | { visibility: "private"; orgs: readonly string[] };

export type SoloThemeDefinition = {
  name: string;
  label: string;
  access: SoloThemeAccess;
};

const PUBLIC = { visibility: "public" } as const satisfies SoloThemeAccess;
const privateTo = (...orgs: string[]): SoloThemeAccess => ({ visibility: "private", orgs });

export const soloThemes = {
  default: { name: "default", label: "Default", access: PUBLIC },
  "modern-edge": { name: "modern-edge", label: "Modern Edge", access: PUBLIC },
  "classy-candela": { name: "classy-candela", label: "Classy Candela", access: PUBLIC },
  ruedx: { name: "ruedx", label: "RuedX", access: privateTo("ruedx") },
  "merseyside-latin-festival": {
    name: "merseyside-latin-festival",
    label: "Merseyside Latin Festival",
    access: privateTo("merseyside-latin-festival"),
  },
} as const satisfies Record<string, SoloThemeDefinition>;

export type SoloThemeName = keyof typeof soloThemes;

export const soloThemeList: readonly SoloThemeDefinition[] = Object.values(soloThemes);

export const getSoloTheme = (name: string): SoloThemeDefinition | undefined =>
  Object.prototype.hasOwnProperty.call(soloThemes, name)
    ? soloThemes[name as SoloThemeName]
    : undefined;

/** True when the theme exists and is public, or is private and lists this org. */
export const canOrgUseTheme = (org: string, name: string): boolean => {
  const theme = getSoloTheme(name);
  if (!theme) return false;
  return theme.access.visibility === "public" || theme.access.orgs.includes(org);
};

/** Themes an organisation may choose from, in display order. */
export const getThemesForOrg = (org: string): SoloThemeDefinition[] =>
  soloThemeList.filter((theme) => canOrgUseTheme(org, theme.name));
