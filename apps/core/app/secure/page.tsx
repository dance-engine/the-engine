'use client'
import useClerkSWR from '@dance-engine/utils/clerkSWR';

// const mealSummaryApiUrl = "https://a5qvybvrc7.execute-api.eu-west-1.amazonaws.com/test"
const exampleApiCall = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}/example-org/events`

export default function SecurePage() {
  // const {data: summaryData, error: summaryError, isLoading: summaryLoading, isValidating: summaryValidating} = useClerkSWR(exampleApiCall);
  const {data: summaryData} = useClerkSWR(exampleApiCall);
  return <div>
    <h1 className='text-xl'>Secured</h1>
    <pre>{JSON.stringify(summaryData,null,2)}</pre>
  </div>
}