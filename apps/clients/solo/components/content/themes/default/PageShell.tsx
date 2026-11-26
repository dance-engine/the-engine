import type { PageShellProps } from "../types";

export default function PageShell({ children }: PageShellProps) {
  return <main className="bg-(--section-bg,var(--color-white)) text-(--section-fg,var(--color-slate-950))">{children}</main>;
}
