import { redirect } from 'next/navigation';
import KSUID from 'ksuid';

export const dynamic = 'force-dynamic'

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ ksuid: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { ksuid } = await params;
  const queryParams = await searchParams;
  const itemKsuid = KSUID.randomSync().string;

  const query = new URLSearchParams(queryParams as Record<string, string>).toString();
  const redirectUrl = `/events/${ksuid}/items/${itemKsuid}/edit${query ? `?${query}` : ''}`;

  redirect(redirectUrl);
}
