import type { PageShellProps } from "../types";

// mlf page: sections without their own colour (text, image, image and text, grid, social, FAQ) use mlf's
// page blue, a slightly lighter blue than the menu bar and the dark sections (the org's background colours)
// so the page sections stand apart from them. The default sections read it through the --section-* variables.
const shellClasses = [
  "bg-(--section-bg) text-(--section-fg)",
  "[--section-bg:#243d82]",
  "[--section-fg:var(--color-white)]",
  // Secondary text and dividing lines: the text colour, faded.
  "[--section-muted:color-mix(in_srgb,var(--section-fg)_75%,transparent)]",
  "[--section-border:color-mix(in_srgb,var(--section-fg)_20%,transparent)]",
  // Rich text (.prose) sets its own slate colours, so point those at the section colours too.
  "[&_.prose]:[--tw-prose-body:var(--section-fg)]",
  "[&_.prose]:[--tw-prose-headings:var(--section-fg)]",
  "[&_.prose]:[--tw-prose-lead:var(--section-fg)]",
  "[&_.prose]:[--tw-prose-links:var(--section-fg)]",
  "[&_.prose]:[--tw-prose-bold:var(--section-fg)]",
  "[&_.prose]:[--tw-prose-quotes:var(--section-fg)]",
  "[&_.prose]:[--tw-prose-code:var(--section-fg)]",
  "[&_.prose]:[--tw-prose-counters:var(--section-muted)]",
  "[&_.prose]:[--tw-prose-bullets:var(--section-muted)]",
  "[&_.prose]:[--tw-prose-captions:var(--section-muted)]",
  "[&_.prose]:[--tw-prose-hr:var(--section-border)]",
  "[&_.prose]:[--tw-prose-quote-borders:var(--section-border)]",
  "[&_.prose]:[--tw-prose-th-borders:var(--section-border)]",
  "[&_.prose]:[--tw-prose-td-borders:var(--section-border)]",
].join(" ");

export default function PageShell({ children }: PageShellProps) {
  return <main className={shellClasses}>{children}</main>;
}
