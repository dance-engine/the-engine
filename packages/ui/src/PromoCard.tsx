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

  const colourClass = colour == 'cerise'
    ? "bg-cerise-on-light dark:bg-cerise-on-dark"
    : colour == 'pear'
      ? "bg-pear-on-light dark:bg-pear-on-dark"
      : colour == 'keppel'
        ? "bg-keppel-on-light dark:bg-keppel-on-dark"
        : "bg-dark-background dark:bg-dark-highlight";

  return (
    <div className={`relative rounded-xl shadow-contained ${className}`.trim()}>
      
      <div className="flex h-full flex-col justify-between overflow-hidden rounded-lg bg-white text-gray-700 dark:bg-dark-background dark:text-dark-secondary">
        {image ? <div className="shrink-0 absolute right-0 -top-2">{image}</div> : null}
        <div className="flex justify-between gap-4 px-4 py-5 mr-12 sm:p-6 ">
          <div>
            <h2 className="text-2xl text-gray-900 dark:text-white">{title}</h2>
            {children}
          </div>
          
        </div>
        <div className={`${colourClass} `}>
        <Link href={href} className="flex h-full w-full items-center justify-between px-4 py-4 font-bold text-white dark:text-uberdark-background sm:px-6">{cta} <FaArrowRightLong /></Link>
        </div>
      </div>
    </div>
  );
}
