import PageCustomerDetailClient from "./pageClient";

const CusomterDetailPage = async ({
  params,
}: {
  params: Promise<{ ksuid: string; }>;
}) => {
  const { ksuid } = await params;

  return <PageCustomerDetailClient email={decodeURIComponent(ksuid)} />;
};

export default CusomterDetailPage;
