'use client'
import useSWR from 'swr'

const fetcher = (...args) => fetch(...args).then(res => res.json())
const exampleApiCall = "/api//secure/trigger"


export default function Secured() {
  const { data: summaryData } = useSWR(exampleApiCall,fetcher)
  return <div>
    <pre>{JSON.stringify(summaryData,null,2)}</pre>
  </div>
}