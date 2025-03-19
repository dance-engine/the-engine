'use client'
import { useState } from "react"
import { CgDebug } from "react-icons/cg";

const Debug = ({debug, className}: {debug:any, className?:string}) => {
  const [shown, setShown] = useState(false)
  return (
    <div {...(className && { className })}>
      <button onClick={()=>{setShown(!shown)}} className="rounded-full p-2 bg-gray-200 " aria-label="Toggle Debug Window">
      <CgDebug />
      </button>
      <pre suppressHydrationWarning className={`${shown ? '' : 'hidden'} z-[1010] absolute right-0 bg-white p-3 border rounded w-[90vw] whitespace-pre-line`}>
        {JSON.stringify(debug,null,2)}
      </pre>
    </div>
  )
}

export default Debug