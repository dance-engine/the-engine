import { redirect } from 'next/navigation';
import KSUID from 'ksuid';

export default function NewEventRedirectPage() {
  const ksuid = KSUID.randomSync().string;

  redirect(`/events/${ksuid}`);
}