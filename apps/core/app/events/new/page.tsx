import { redirect } from 'next/navigation';
import KSUID from 'ksuid';

export const dynamic = 'force-dynamic'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = (await searchParams)
  const ksuid = KSUID.randomSync().string;

  const query = new URLSearchParams(params as Record<string, string>).toString();
  const redirectUrl = `/events/${ksuid}/edit${query ? `?${query}` : ''}`;


  redirect(redirectUrl);
}