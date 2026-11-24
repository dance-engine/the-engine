import { headers } from "next/headers";
import type { Metadata } from "next";
import { SanityContentRoute, getSanityPageMetadata } from "@/components/content/SanityContentRoute";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const [{ slug }, requestHeaders] = await Promise.all([params, headers()]);
  const organisation = requestHeaders.get("x-site-org") || "default-org";
  return getSanityPageMetadata(organisation, slug);
}

export default async function ContentPage({ params }: PageProps) {
  const [{ slug }, requestHeaders] = await Promise.all([params, headers()]);
  const organisation = requestHeaders.get("x-site-org") || "default-org";
  return <SanityContentRoute organisation={organisation} slug={slug} />;
}
