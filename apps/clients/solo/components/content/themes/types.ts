import type { ComponentType, ReactNode } from "react";
import type { OrganisationType } from "@dance-engine/schemas/organisation";
import type { NavigationLink } from "@/components/header/TopLevelNavigation";
import type { PageSection } from "@/lib/sanity/content";
import type { SanityProjectConfig } from "@/lib/sanity/projects";

export type SectionType = PageSection["_type"];

export type SectionOf<K extends SectionType> = Extract<PageSection, { _type: K }>;

export type RenderSectionOptions = { compact?: boolean };

export type SectionProps<K extends SectionType> = {
  section: SectionOf<K>;
  project: SanityProjectConfig;
  /** The org's slug (e.g. for loading its events from Dance Engine). */
  organisation: string;
  /** True when the section is rendered as an item inside a sectionGrid. */
  compact?: boolean;
  /** Renders a nested section with the active theme (used by sectionGrid). */
  renderSection: (section: PageSection, options?: RenderSectionOptions) => ReactNode;
};

/** One component per Sanity section type. The default theme must provide all of them. */
export type SectionComponents = {
  [K in SectionType]: ComponentType<SectionProps<K>>;
};

export type PageShellProps = { children: ReactNode };

/** Site header. Data (org, navigation links) is loaded by components/header/Header.tsx. */
export type HeaderProps = { org: OrganisationType; links: NavigationLink[] };

/** A complete theme. Only the default theme is written this way. */
export type ResolvedTheme = {
  name: string;
  Header: ComponentType<HeaderProps>;
  PageShell: ComponentType<PageShellProps>;
  sections: SectionComponents;
};

/**
 * A theme override: anything left out falls back to the default theme,
 * so a theme only needs to contain the sections it changes.
 */
export type Theme = {
  name: string;
  Header?: ComponentType<HeaderProps>;
  PageShell?: ComponentType<PageShellProps>;
  sections?: Partial<SectionComponents>;
};
