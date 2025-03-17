import Secured from './secure'
export default function SecurePage() {
  // const {data: summaryData, error: summaryError, isLoading: summaryLoading, isValidating: summaryValidating} = useClerkSWR(exampleApiCall);
  // const {data: summaryData} = useAuthdSWR(exampleApiCall);
  return <div>
    <h1 className='text-xl'>Secured</h1>
  <Secured/>
</div>
}