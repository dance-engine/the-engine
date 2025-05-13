'use client'
import { EventType } from '@dance-engine/schemas/events';
import useClerkSWR from '@dance-engine/utils/clerkSWR';
import { useOrgContext } from '@dance-engine/utils/OrgContext';

// const mealSummaryApiUrl = "https://a5qvybvrc7.execute-api.eu-west-1.amazonaws.com/test"
const exampleApiCall = `${process.env.NEXT_PUBLIC_DANCE_ENGINE_API}{org}/events`

export default function SecurePage() {
  // const {data: summaryData, error: summaryError, isLoading: summaryLoading, isValidating: summaryValidating} = useClerkSWR(exampleApiCall);
  const { activeOrg } = useOrgContext() 
  const {data: summaryData, isLoading} = useClerkSWR(exampleApiCall.replace('/{org}',activeOrg ? `/${activeOrg}`: ''));
  if(isLoading) {
    return <div>Loading</div>
  }
  return <div>
    <h1 className='text-xl'>Secured {activeOrg}</h1>
    <pre>{summaryData && JSON.stringify([...summaryData.events.map((r: EventType) => { return {...r, description: JSON.parse(r.description)} })],null,2)}</pre>
  </div>
}