import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import { redirect } from "next/navigation";

type SignupPageProps = {
  searchParams?: Promise<{
    redirect_url?: string | string[];
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = await searchParams;
  const redirectParam = resolvedSearchParams?.redirect_url;
  const redirectUrl = Array.isArray(redirectParam) ? redirectParam[0] : redirectParam;
  const { userId } = await auth();

  const safeRedirectUrl = (() => {
    if (!redirectUrl) {
      return null;
    }

    try {
      const parsed = new URL(redirectUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  })();

  if (userId) {
    redirect(safeRedirectUrl ?? "/");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ background: "url('/circuits.jpg') top center / cover no-repeat" }}
      />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-dark-outline/40 bg-white/95 p-5 shadow-xl backdrop-blur-sm sm:p-6">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <Image src="/dance-engine-logo-wide.png" alt="Dance Engine" width={196} height={40} priority />
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scanner Sign Up</p>
        </div>

        <SignUp fallbackRedirectUrl="/" forceRedirectUrl={safeRedirectUrl ?? undefined} />
      </section>
    </main>
  );
}
