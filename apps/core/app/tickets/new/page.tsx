import KSUID from "ksuid";
import PageClient from "./pageClient";

export const dynamic = "force-dynamic";

const getSingleSearchParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  return (
    <PageClient
      draftKsuid={KSUID.randomSync().string}
      initialEventKsuid={getSingleSearchParam(params.event)}
      initialCustomerEmail={getSingleSearchParam(params.customer)}
      initialNameOnTicket={getSingleSearchParam(params.name)}
      returnTo={getSingleSearchParam(params.returnTo)}
    />
  );
}
