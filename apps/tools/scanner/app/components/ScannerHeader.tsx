import Image from "next/image";
import { FiChevronRight } from "react-icons/fi";

type ScannerHeaderProps = {
  selectedOrg: string;
  selectedEventName: string | null;
};

export default function ScannerHeader({ selectedOrg, selectedEventName }: ScannerHeaderProps) {
  return (
    <section className="bg-dark-background p-4 shadow-sm flex justify-center">
      <div className="w-full max-w-xl flex justify-between gap-3 text-2xl font-semibold text-primary-text-highlight">
        <div className="flex gap-3">
          <Image src="/dance-engine-sq.png" alt="Scanner Icon" width={36} height={36} /> Scanner
        </div>
        <div className="flex items-center gap-1 text-right text-base">
          {selectedOrg ? <span>{selectedOrg}</span> : null}
          {selectedOrg && selectedEventName ? <FiChevronRight className="h-4 w-4 shrink-0" /> : null}
          {selectedEventName ? <span>{selectedEventName}</span> : null}
        </div>
      </div>
    </section>
  );
}
