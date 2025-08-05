import { useState } from "react";
import { MdDelete } from "react-icons/md";

const DeleteButton = ({className, ksuid, onClick, children}: {className?:string, ksuid?: string, onClick?: (ksuid: string) => void, children?: React.ReactNode}) => {
  const [dangerMode, setDangerMode] = useState(false);
  return dangerMode 
      ? <button className={className?.replaceAll("bg-keppel-on-light", "bg-red-600")} role="button" onClick={() => onClick?.(ksuid as string)}><MdDelete></MdDelete> Really?</button>
      : <button className={className} role="button" onClick={() => setDangerMode(true)}>{children}</button>}

export default DeleteButton