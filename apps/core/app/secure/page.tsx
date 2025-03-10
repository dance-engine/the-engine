'use client'
import useClerkSWR from '@dance-engine/utilties/clerkSWR';

// const mealSummaryApiUrl = "https://a5qvybvrc7.execute-api.eu-west-1.amazonaws.com/test"
const exampleApiCall = "https://q8ut73qldj.execute-api.eu-west-1.amazonaws.com/trigger"

export default function SecurePage() {
  const {data: summaryData, error: summaryError, isLoading: summaryLoading, isValidating: summaryValidating} = useClerkSWR(exampleApiCall);
  return <div>
    <h1 className='text-xl'>Secured</h1>
    <pre>{JSON.stringify(summaryData,null,2)}</pre>
  </div>
}