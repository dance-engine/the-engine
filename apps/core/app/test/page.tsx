'use client'
import { useOrgContext } from '@dance-engine/utils/OrgContext';
import { useGlobalState} from '@dance-engine/utils/StateContext'

// const mealSummaryApiUrl = "https://a5qvybvrc7.execute-api.eu-west-1.amazonaws.com/test"

export default function SecurePage() {
  // const {data: summaryData, error: summaryError, isLoading: summaryLoading, isValidating: summaryValidating} = useClerkSWR(exampleApiCall);
  const { activeOrg } = useOrgContext() 
  const { state, actions } = useGlobalState()
  
  return <div className='px-4'>
    <h1 className='text-xl'>Testing org:{activeOrg}</h1>
    <pre className='mb-4'>{JSON.stringify(state)}</pre>
    <button 
      className='bg-amber-700 rounded text-white px-4 py-1'
      onClick={()=>{ actions.setCurrentOrg({currentOrg: activeOrg})}}
    >
      Set Current Org
    </button>
  </div>
}