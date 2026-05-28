import { useState, type ReactNode } from "react";
import { MdWarningAmber } from "react-icons/md";

const DestructiveButton = ({className, record, onClick, children}: {className?:string, record?: Record<string, unknown>, onClick: (record: Record<string, unknown>) => void | Promise<void>, children?: ReactNode}) => {
  const [dangerMode, setDangerMode] = useState(false);
  const handleConfirmClick = async () => {
    if (!record) {
      setDangerMode(false);
      return;
    }

    try {
      await onClick(record);
    } finally {
      setDangerMode(false);
    }
  };

  return dangerMode && record
  ? <span className="flex items-center gap-2">
      <button className={className?.replaceAll("bg-keppel-on-light", "bg-red-600")} role="button" onClick={handleConfirmClick}><MdWarningAmber className="w-5 h-5"></MdWarningAmber> <span className="">Really?</span></button>
      <button className="rounded px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100" role="button" onClick={() => setDangerMode(false)}>Cancel</button>
    </span>
      : <button className={className} role="button" onClick={() => setDangerMode(true)}>{children}</button>}

export default DestructiveButton