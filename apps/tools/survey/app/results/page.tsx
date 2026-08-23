import Image from "next/image";
import Link from "next/link";
import { ThemeVariables } from "../theme";
import ResultsDashboard from "./ResultsDashboard";

export const metadata = {
  title: "Survey results | Dance Community Survey",
  description: "Explore the anonymous, aggregated results of the dance community survey.",
};

export default function ResultsPage() {
  return <><ThemeVariables /><main className="min-h-screen bg-[var(--sbk-page)] px-4 py-6 text-[var(--sbk-text)] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-6xl">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-5">
        <Link href="/" aria-label="Back to the survey">
          <Image src="/logo-light.png" alt="" width={256} height={128} priority className="h-20 w-auto dark:hidden" />
          <Image src="/logo-dark.png" alt="" width={256} height={128} priority className="hidden h-20 w-auto dark:block" />
        </Link>
        <Link href="/" className="rounded-full border border-[var(--sbk-border)] bg-[var(--sbk-surface)] px-5 py-2.5 text-sm font-bold hover:bg-[var(--sbk-hover)]">Take the survey →</Link>
      </header>
      <div className="mb-9 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--sbk-primary)]">Live community results</p>
        <h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">What dancers are telling us.</h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--sbk-text-muted)]">A growing picture of where people dance, how they learn, and what they love.</p>
      </div>
      <ResultsDashboard />
    </div>
  </main></>;
}
