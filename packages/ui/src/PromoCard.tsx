import { type ReactNode } from "react";
import Link from "next/link";
import { FaArrowRightLong } from "react-icons/fa6";

export function PromoCard({
  title,
  href,
  cta,
  colour,
  className = "",
  image,
  children
}: {
  className?: string;
  title: string;
  href: string;
  cta: string;
  colour?: string;
  image?: ReactNode;
  children: ReactNode;
}) {

  const colourClass = colour == 'cerise' ? "bg-cerise-on-light" : colour == 'pear' ? "bg-pear-on-light" : colour == 'keppel' ? "bg-keppel-on-light" : "bg-dark-background"
  return (
    <div className={`relative rounded-xl shadow-contained ${className}`.trim()}>
      
      <div className="overflow-hidden rounded-lg bg-white flex flex-col justify-between h-full">
        {image ? <div className="shrink-0 absolute right-0 -top-2">{image}</div> : null}
        <div className="flex justify-between gap-4 px-4 py-5 mr-12 sm:p-6 ">
          <div>
            <h2 className="text-2xl">{title}</h2>
            {children}
          </div>
          
        </div>
        <div className={`${colourClass} `}>
        <Link href={href} className="text-white font-bold flex items-center justify-between h-full w-full px-4 py-4 sm:px-6">{cta} <FaArrowRightLong /></Link>
        </div>
      </div>
    </div>
  );
}
