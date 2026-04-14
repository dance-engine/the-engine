import PageTicketDetailClient from "./pageClient";

const EventTicketDetailPage = async ({
  params,
}: {
  params: Promise<{ ksuid: string; ticketKsuid: string }>;
}) => {
  const { ksuid, ticketKsuid } = await params;

  return <PageTicketDetailClient ksuid={ksuid} ticketKsuid={ticketKsuid} />;
};

export default EventTicketDetailPage;
