import type { PageShellProps } from "../types";

export default function PageShell({ children }: PageShellProps) {
  return <main className="bg-white text-slate-950">{children}</main>;
}
