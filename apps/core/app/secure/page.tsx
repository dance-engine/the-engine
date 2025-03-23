'use client'
import useClerkSWR from '@dance-engine/utils/clerkSWR';
import { useOrg } from '../../lib/OrgContext';

// const mealSummaryApiUrl = "https://a5qvybvrc7.execute-api.eu-west-1.amazonaws.com/test"
const exampleApiCall = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/{org}/events`

export default function SecurePage() {
  // const {data: summaryData, error: summaryError, isLoading: summaryLoading, isValidating: summaryValidating} = useClerkSWR(exampleApiCall);
  const { orgSlug } = useOrg()
  const {data: summaryData} = useClerkSWR(exampleApiCall.replace('/{org}',orgSlug ? `/${orgSlug}` : ''));
  
  return (
    <div className="min-h-screen flex flex-col justify-start items-center px-2 sm:px-4 lg:px-8 ">
      <h1 className='text-xl'>Secured</h1>
      <pre>{JSON.stringify(summaryData,null,2)}</pre>
    </div>
  )
}