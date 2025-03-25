import { type ReactNode } from "react";
import Link from "next/link";
import { FaArrowRightLong } from "react-icons/fa6";

export function PromoCard({
  title,
  href,
  cta,
  colour,
  children
}: {
  title: string;
  href: string;
  cta: string;
  colour?: string
  children: ReactNode;
}) {

  const colourClass = colour == 'cerise' ? "bg-cerise-on-light" : colour == 'pear' ? "bg-pear-on-light" : colour == 'keppel' ? "bg-keppel-on-light" : "bg-dark-background"
  return (
    <div className="relative rounded-xl shadow-contained  ">
    <div className="overflow-hidden rounded-lg bg-white ">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-2xl">{title}</h2>
        {children}
      </div>
      <div className={`${colourClass} px-4 py-4 sm:px-6`}>
       <Link href={href} className="text-white font-bold flex items-center justify-between">{cta} <FaArrowRightLong /></Link>
      </div>
    </div>
    </div>
  );
}
