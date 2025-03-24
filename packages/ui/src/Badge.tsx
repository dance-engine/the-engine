import { ReactNode } from "react"

const Badge = ({children} : { children:ReactNode}) => {
  return <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
    {children}
  </span>
}

export default Badge