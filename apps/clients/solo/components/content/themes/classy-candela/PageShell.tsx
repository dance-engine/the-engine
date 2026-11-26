import type { PageShellProps } from "../types";
import { candelaColourVariables, onLight } from "./styles";

// The page is the light background with its own text colour, and every heading in the serif. Sections without
// their own colour (the default text, image, social and grid sections) read the page colours through the
// --section-* variables that onLight sets.
const shellClasses = [
  candelaColourVariables,
  onLight,
  "[--section-border:color-mix(in_srgb,var(--cc-gold)_55%,transparent)]",
  // Serif headings everywhere, at a lighter weight than the default sections' bold.
  "[&_h1]:font-classy [&_h2]:font-classy [&_h3]:font-classy",
  "[&_h1]:font-medium [&_h2]:font-medium [&_h3]:font-medium",
  "[&_h1]:tracking-normal [&_h2]:tracking-normal",
  // Rich text (.prose) sets its own slate colours, so point those at the area's colours (set on each .prose
  // element, so they follow the area it's in); links use the primary colour.
  "[&_.prose]:[--tw-prose-body:var(--section-fg)]",
  "[&_.prose]:[--tw-prose-headings:var(--section-fg)]",
  "[&_.prose]:[--tw-prose-lead:var(--section-fg)]",
  "[&_.prose]:[--tw-prose-links:var(--cc-action)]",
  "[&_.prose]:[--tw-prose-bold:var(--section-fg)]",
  "[&_.prose]:[--tw-prose-quotes:var(--section-fg)]",
  "[&_.prose]:[--tw-prose-counters:var(--section-muted)]",
  "[&_.prose]:[--tw-prose-bullets:var(--cc-gold)]",
  "[&_.prose]:[--tw-prose-captions:var(--section-muted)]",
  "[&_.prose]:[--tw-prose-hr:var(--section-border)]",
  "[&_.prose]:[--tw-prose-quote-borders:var(--cc-gold)]",
  "[&_.prose]:[--tw-prose-th-borders:var(--section-border)]",
  "[&_.prose]:[--tw-prose-td-borders:var(--section-border)]",
].join(" ");

export default function PageShell({ children }: PageShellProps) {
  return <main className={shellClasses}>{children}</main>;
}
