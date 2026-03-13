import { OrganisationType } from "@dance-engine/schemas/organisation";

export type OrganisationTheme = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;
  background: string;
  backgroundAlt: string;
  textPrimary: string;
  textSecondary: string;
  textInverted: string;
  logoUrl?: string;
  logoSecondaryUrl?: string;
  logoIconUrl?: string;
  cssText: string;
};

const defaults = {
  primary: "#e76f51",
  primaryDark: "#b84a2f",
  primaryLight: "#f8c5b8",
  secondary: "#1f3c88",
  secondaryDark: "#13275d",
  secondaryLight: "#c8d7ff",
  background: "#081224",
  backgroundAlt: "#111c34",
  textPrimary: "#f8fafc",
  textSecondary: "#c7d2e1",
  textInverted: "#081224",
};

export const getOrganisationTheme = (org: OrganisationType): OrganisationTheme => {
  const theme = {
    primary: org.colour_primary || defaults.primary,
    primaryDark: org.colour_primary_dark || org.colour_primary || defaults.primaryDark,
    primaryLight: org.colour_primary_light || defaults.primaryLight,
    secondary: org.colour_secondary || defaults.secondary,
    secondaryDark: org.colour_secondary_dark || org.colour_secondary || defaults.secondaryDark,
    secondaryLight: org.colour_secondary_light || defaults.secondaryLight,
    background: org.colour_background || defaults.background,
    backgroundAlt: org.colour_background_alt || defaults.backgroundAlt,
    textPrimary: org.colour_text_primary || defaults.textPrimary,
    textSecondary: org.colour_text_secondary || defaults.textSecondary,
    textInverted: org.colour_text_inverted || defaults.textInverted,
    logoUrl: org.logo || org.logo_secondary_url,
    logoSecondaryUrl: org.logo_secondary_url || org.logo,
    logoIconUrl: org.logo_icon_url || org.logo || org.logo_secondary_url,
  };

  const cssText = `
    :root {
      --org-color-primary: ${theme.primary};
      --org-color-primary-dark: ${theme.primaryDark};
      --org-color-primary-light: ${theme.primaryLight};
      --org-color-secondary: ${theme.secondary};
      --org-color-secondary-dark: ${theme.secondaryDark};
      --org-color-secondary-light: ${theme.secondaryLight};
      --org-color-background: ${theme.background};
      --org-color-background-alt: ${theme.backgroundAlt};
      --org-color-text-primary: ${theme.textPrimary};
      --org-color-text-secondary: ${theme.textSecondary};
      --org-color-text-inverted: ${theme.textInverted};

      --main-bg-color: var(--org-color-background);
      --main-text-color: var(--org-color-text-primary);
      --alternate-bg-color: var(--org-color-background-alt);
      --highlight-color: var(--org-color-primary);
      --highlight-color-dark: var(--org-color-primary-dark);
      --highlight-color-light: var(--org-color-primary-light);
      --accent-color: var(--org-color-secondary);
      --accent-color-dark: var(--org-color-secondary-dark);
      --accent-color-light: var(--org-color-secondary-light);
      --surface-text-color: var(--org-color-text-inverted);
      --muted-text-color: var(--org-color-text-secondary);
    }

    :root,
    :root[data-dev-color-scheme="light"] {
      --scheme-page-bg-start: color-mix(in srgb, var(--org-color-secondary-light) 42%, white);
      --scheme-page-bg-mid: color-mix(in srgb, var(--org-color-primary-light) 35%, var(--org-color-secondary-light));
      --scheme-page-bg-end: #ffffff;
      --scheme-page-text: var(--org-color-text-inverted);
      --scheme-page-text-muted: color-mix(in srgb, var(--org-color-text-inverted) 62%, white);
      --scheme-surface-bg: rgba(255, 255, 255, 0.86);
      --scheme-surface-bg-strong: #ffffff;
      --scheme-surface-bg-soft: color-mix(in srgb, var(--org-color-primary-light) 14%, white);
      --scheme-surface-border: rgba(15, 23, 42, 0.10);
      --scheme-surface-text: var(--org-color-text-inverted);
      --scheme-surface-muted: color-mix(in srgb, var(--org-color-text-inverted) 62%, white);
      --scheme-panel-bg: color-mix(in srgb, var(--org-color-secondary-dark) 92%, black);
      --scheme-panel-bg-soft: color-mix(in srgb, var(--org-color-secondary) 20%, white);
      --scheme-panel-text: var(--org-color-text-primary);
      --scheme-panel-muted: color-mix(in srgb, var(--org-color-text-primary) 60%, transparent);
      --scheme-overlay-start: color-mix(in srgb, var(--org-color-primary-light) 30%, transparent);
      --scheme-overlay-mid: color-mix(in srgb, var(--org-color-background-alt) 18%, white);
      --scheme-overlay-end: color-mix(in srgb, var(--org-color-primary-dark) 32%, var(--org-color-secondary-dark));
      --scheme-hero-glass: rgba(255, 255, 255, 0.14);
      --scheme-hero-chip: rgba(255, 255, 255, 0.84);
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-dev-color-scheme]) {
        --scheme-page-bg-start: var(--org-color-background);
        --scheme-page-bg-mid: var(--org-color-background-alt);
        --scheme-page-bg-end: color-mix(in srgb, var(--org-color-secondary-light) 30%, var(--org-color-background));
        --scheme-page-text: var(--org-color-text-primary);
        --scheme-page-text-muted: var(--org-color-text-secondary);
        --scheme-surface-bg: rgba(15, 23, 42, 0.72);
        --scheme-surface-bg-strong: rgba(15, 23, 42, 0.94);
        --scheme-surface-bg-soft: rgba(255, 255, 255, 0.05);
        --scheme-surface-border: rgba(255, 255, 255, 0.12);
        --scheme-surface-text: var(--org-color-text-primary);
        --scheme-surface-muted: color-mix(in srgb, var(--org-color-text-primary) 62%, transparent);
        --scheme-panel-bg: rgba(7, 12, 24, 0.94);
        --scheme-panel-bg-soft: rgba(255, 255, 255, 0.07);
        --scheme-panel-text: var(--org-color-text-primary);
        --scheme-panel-muted: rgba(255, 255, 255, 0.6);
        --scheme-overlay-start: color-mix(in srgb, var(--org-color-primary-light) 20%, transparent);
        --scheme-overlay-mid: color-mix(in srgb, var(--org-color-background-alt) 76%, transparent);
        --scheme-overlay-end: color-mix(in srgb, var(--org-color-primary-dark) 82%, var(--org-color-background));
        --scheme-hero-glass: rgba(255, 255, 255, 0.10);
        --scheme-hero-chip: rgba(255, 255, 255, 0.92);
      }
    }

    :root[data-dev-color-scheme="dark"] {
      --scheme-page-bg-start: var(--org-color-background);
      --scheme-page-bg-mid: var(--org-color-background-alt);
      --scheme-page-bg-end: color-mix(in srgb, var(--org-color-secondary-light) 30%, var(--org-color-background));
      --scheme-page-text: var(--org-color-text-primary);
      --scheme-page-text-muted: var(--org-color-text-secondary);
      --scheme-surface-bg: rgba(15, 23, 42, 0.72);
      --scheme-surface-bg-strong: rgba(15, 23, 42, 0.94);
      --scheme-surface-bg-soft: rgba(255, 255, 255, 0.05);
      --scheme-surface-border: rgba(255, 255, 255, 0.12);
      --scheme-surface-text: var(--org-color-text-primary);
      --scheme-surface-muted: color-mix(in srgb, var(--org-color-text-primary) 62%, transparent);
      --scheme-panel-bg: rgba(7, 12, 24, 0.94);
      --scheme-panel-bg-soft: rgba(255, 255, 255, 0.07);
      --scheme-panel-text: var(--org-color-text-primary);
      --scheme-panel-muted: rgba(255, 255, 255, 0.6);
      --scheme-overlay-start: color-mix(in srgb, var(--org-color-primary-light) 20%, transparent);
      --scheme-overlay-mid: color-mix(in srgb, var(--org-color-background-alt) 76%, transparent);
      --scheme-overlay-end: color-mix(in srgb, var(--org-color-primary-dark) 82%, var(--org-color-background));
      --scheme-hero-glass: rgba(255, 255, 255, 0.10);
      --scheme-hero-chip: rgba(255, 255, 255, 0.92);
    }
  `;

  return {
    ...theme,
    cssText: `${cssText}\n${org.css_vars || ""}`,
  };
};
