import { useState } from "react";
import { MdDelete } from "react-icons/md";

const DestructiveButton = ({className, record, onClick, children}: {className?:string, record?: Record<string, unknown>, onClick: (record: Record<string, unknown>) => Promise<void>, children?: React.ReactNode}) => {
  const [dangerMode, setDangerMode] = useState(false);
  return dangerMode && record
      ? <button className={className?.replaceAll("bg-keppel-on-light", "bg-red-600")} role="button" onClick={() => onClick(record)}><MdDelete className="w-5 h-5"></MdDelete> <span className="">Really?</span></button>
      : <button className={className} role="button" onClick={() => setDangerMode(true)}>{children}</button>}

export default DestructiveButton