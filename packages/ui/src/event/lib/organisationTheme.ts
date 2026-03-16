import { OrganisationType } from "@dance-engine/schemas/organisation";

type RGB = { r: number; g: number; b: number };

type OrganisationThemeFields = Partial<OrganisationTheme> & {
  logo?: string;
  logo_secondary_url?: string;
  logo_icon_url?: string;
  colour_primary?: string;
  colour_secondary?: string;
  colour_background_light?: string;
  colour_background_dark?: string;
  colour_surface_light?: string;
  colour_surface_dark?: string;
  colour_background?: string;
  colour_background_alt?: string;
  css_vars?: string;
};

type OrganisationThemeSource = OrganisationThemeFields & {
  theme?: OrganisationThemeFields;
};

export type OrganisationTheme = {
  primary: string;
  secondary: string;
  backgroundLight: string;
  backgroundDark: string;
  surfaceLight: string;
  surfaceDark: string;
  logoUrl?: string;
  logoSecondaryUrl?: string;
  logoIconUrl?: string;
  cssText: string;
};

const defaults = {
  primary: "#e76f51",
  secondary: "#2d5b87",
  backgroundLight: "#f8fafc",
  backgroundDark: "#0f172a",
};

const clamp = (value: number, min = 0, max = 255) =>
  Math.min(max, Math.max(min, Math.round(value)));

const normalizeHex = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith("#")) return undefined;

  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }

  if (trimmed.length === 7) {
    return trimmed.toLowerCase();
  }

  return undefined;
};

const toRgb = (value: string): RGB => {
  const hex = normalizeHex(value) || defaults.backgroundDark;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
};

const toHex = ({ r, g, b }: RGB) =>
  `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;

const mix = (from: string, to: string, weight: number) => {
  const a = toRgb(from);
  const b = toRgb(to);
  return toHex({
    r: a.r + (b.r - a.r) * weight,
    g: a.g + (b.g - a.g) * weight,
    b: a.b + (b.b - a.b) * weight,
  });
};

const withAlpha = (value: string, alpha: number) => {
  const { r, g, b } = toRgb(value);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const luminance = (value: string) => {
  const { r, g, b } = toRgb(value);
  const channel = (channelValue: number) => {
    const normalized = channelValue / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrastRatio = (a: string, b: string) => {
  const lighter = Math.max(luminance(a), luminance(b));
  const darker = Math.min(luminance(a), luminance(b));
  return (lighter + 0.05) / (darker + 0.05);
};

const isDark = (value: string) => luminance(value) < 0.42;

const readableText = (background: string) =>
  contrastRatio("#ffffff", background) >= contrastRatio("#0f172a", background)
    ? "#ffffff"
    : "#0f172a";

const mutedText = (background: string, text: string) =>
  mix(text, background, isDark(background) ? 0.3 : 0.42);

const readableAccent = (accent: string, background: string) => {
  if (contrastRatio(accent, background) >= 3) {
    return accent;
  }

  return mix(accent, readableText(background), 0.28);
};

const deriveSurface = (background: string, accent: string) =>
  mix(
    mix(
      background,
      isDark(background) ? "#ffffff" : "#000000",
      isDark(background) ? 0.08 : 0.04,
    ),
    accent,
    isDark(background) ? 0.06 : 0.04,
  );

const getThemeFields = (
  source: OrganisationThemeSource,
): OrganisationThemeFields => ({
  ...source,
  ...source.theme,
});

const getThemeInputs = (
  source: OrganisationThemeSource,
): Omit<OrganisationTheme, "cssText"> => {
  const themeFields = getThemeFields(source);
  const primary =
    normalizeHex(themeFields.primary || themeFields.colour_primary) ||
    defaults.primary;
  const secondary =
    normalizeHex(themeFields.secondary || themeFields.colour_secondary) ||
    defaults.secondary;
  const backgroundLight =
    normalizeHex(
      themeFields.backgroundLight ||
        themeFields.colour_background_light ||
        themeFields.colour_background_alt,
    ) || defaults.backgroundLight;
  const backgroundDark =
    normalizeHex(
      themeFields.backgroundDark ||
        themeFields.colour_background_dark ||
        themeFields.colour_background,
    ) || defaults.backgroundDark;
  const surfaceLight =
    normalizeHex(
      themeFields.surfaceLight || themeFields.colour_surface_light,
    ) || deriveSurface(backgroundLight, primary);
  const surfaceDark =
    normalizeHex(themeFields.surfaceDark || themeFields.colour_surface_dark) ||
    deriveSurface(backgroundDark, secondary);

  return {
    primary,
    secondary,
    backgroundLight,
    backgroundDark,
    surfaceLight,
    surfaceDark,
    logoUrl: source.logoUrl || source.logo || source.logo_secondary_url,
    logoSecondaryUrl:
      source.logoSecondaryUrl || source.logo_secondary_url || source.logo,
    logoIconUrl:
      source.logoIconUrl ||
      source.logo_icon_url ||
      source.logo ||
      source.logo_secondary_url,
  };
};

const buildSchemeCss = ({
  background,
  surface,
  primary,
  secondary,
}: {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
}) => {
  const pageText = readableText(background);
  const pageMuted = mutedText(background, pageText);
  const surfaceText = readableText(surface);
  const surfaceMuted = mutedText(surface, surfaceText);
  const panelBg = mix(surface, secondary, isDark(background) ? 0.22 : 0.14);
  const panelText = readableText(panelBg);
  const panelMuted = mutedText(panelBg, panelText);
  const panelSoft = mix(panelBg, background, isDark(background) ? 0.18 : 0.26);
  const actionText = readableText(primary);
  const actionTextSubtle = mutedText(primary, actionText);
  const secondaryActionText = readableText(secondary);
  const linkColor = readableAccent(primary, surface);
  const heroOverlayStart = mix(
    background,
    primary,
    isDark(background) ? 0.56 : 0.34,
  );
  const heroOverlayEnd = mix(
    background,
    secondary,
    isDark(background) ? 0.34 : 0.18,
  );

  return `
      --scheme-page-bg-start: ${background};
      --scheme-page-bg-mid: ${background};
      --scheme-page-bg-end: ${background};
      --scheme-page-text: ${pageText};
      --scheme-page-text-muted: ${pageMuted};

      --scheme-surface-bg: transparent;
      --scheme-surface-bg-strong: ${surface};
      --scheme-surface-bg-soft: ${mix(surface, primary, isDark(background) ? 0.12 : 0.06)};
      --scheme-surface-border: ${withAlpha(pageText, 0.1)};
      --scheme-surface-text: ${surfaceText};
      --scheme-surface-muted: ${surfaceMuted};

      --scheme-panel-bg: ${panelBg};
      --scheme-panel-bg-soft: ${panelSoft};
      --scheme-panel-text: ${panelText};
      --scheme-panel-muted: ${panelMuted};

      --scheme-hero-text: ${readableText(heroOverlayStart)};
      --scheme-hero-muted: ${mutedText(heroOverlayStart, readableText(heroOverlayStart))};
      --scheme-hero-overlay: linear-gradient(90deg, ${withAlpha(heroOverlayStart, 0.88)} 0%, ${withAlpha(heroOverlayStart, 0.56)} 52%, ${withAlpha(heroOverlayEnd, 0.72)} 100%);

      --scheme-prose-strong: ${surfaceText};
      --scheme-prose-links: ${linkColor};

      --scheme-action-text: ${actionText};
      --scheme-action-text-muted: ${actionTextSubtle};
      --scheme-accent-action-text: ${secondaryActionText};
    `;
};

export const buildOrganisationTheme = (
  source: OrganisationThemeSource,
): OrganisationTheme => {
  const theme = getThemeInputs(source);

  const cssText = `
    :root {
      --org-color-primary: ${theme.primary};
      --org-color-secondary: ${theme.secondary};
      --org-color-background-light: ${theme.backgroundLight};
      --org-color-background-dark: ${theme.backgroundDark};
      --org-color-surface-light: ${theme.surfaceLight};
      --org-color-surface-dark: ${theme.surfaceDark};

      --highlight-color: var(--org-color-primary);
      --accent-color: var(--org-color-secondary);
    }

    :root,
    :root[data-dev-color-scheme="light"] {
${buildSchemeCss({
  background: theme.backgroundLight,
  surface: theme.surfaceLight,
  primary: theme.primary,
  secondary: theme.secondary,
}).trimEnd()}
    }

    @media (prefers-color-scheme: dark) {
      :root:not([data-dev-color-scheme]) {
${buildSchemeCss({
  background: theme.backgroundDark,
  surface: theme.surfaceDark,
  primary: theme.primary,
  secondary: theme.secondary,
}).trimEnd()}
      }
    }

    :root[data-dev-color-scheme="dark"] {
${buildSchemeCss({
  background: theme.backgroundDark,
  surface: theme.surfaceDark,
  primary: theme.primary,
  secondary: theme.secondary,
}).trimEnd()}
    }
  `;

  return {
    ...theme,
    cssText,
  };
};

export const getOrganisationTheme = (
  org: OrganisationType,
): OrganisationTheme =>
  buildOrganisationTheme(org as OrganisationType & OrganisationThemeSource);
