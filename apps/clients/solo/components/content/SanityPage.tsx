import type { ComponentType, ReactNode } from "react";
import type { PageSection, SanityContentPage } from "@/lib/sanity/content";
import type { SanityProjectConfig } from "@/lib/sanity/projects";
import { resolveTheme } from "./themes/registry";
import type { RenderSectionOptions, SectionProps, SectionType } from "./themes/types";

/** Renders a Sanity page using the org's content theme, falling back to the default theme. */
export default function SanityPage({
  page,
  project,
  organisation,
  theme: themeName,
}: {
  page: SanityContentPage;
  project: SanityProjectConfig;
  organisation: string;
  theme?: string | null;
}) {
  const theme = resolveTheme(themeName);

  const renderSection = (section: PageSection, options: RenderSectionOptions = {}): ReactNode => {
    // Correlated union: the component for section._type takes that section's own type.
    const Component = theme.sections[section._type] as ComponentType<SectionProps<SectionType>> | undefined;
    if (!Component) return null;
    return (
      <Component
        key={section._key}
        section={section}
        project={project}
        organisation={organisation}
        compact={options.compact}
        renderSection={renderSection}
      />
    );
  };

  return (
    <theme.PageShell>
      {page.sections?.map((section) => renderSection(section))}
    </theme.PageShell>
  );
}
