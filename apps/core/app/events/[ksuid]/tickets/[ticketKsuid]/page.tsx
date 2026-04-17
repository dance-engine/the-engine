import PageTicketDetailClient from "./pageClient";

const EventTicketDetailPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ ksuid: string; ticketKsuid: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) => {
  const { ksuid, ticketKsuid } = await params;
  const { returnTo } = await searchParams;

  return <PageTicketDetailClient ksuid={ksuid} ticketKsuid={ticketKsuid} returnTo={returnTo} />;
};

export default EventTicketDetailPage;
