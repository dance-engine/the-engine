'use client'

import type { ReactNode } from "react";

interface BuilderCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

const BuilderCard = ({
  title,
  description,
  children,
  className = "",
  footer,
}: BuilderCardProps) => {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${className}`.trim()}>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
      {footer ? <div className="mt-4 border-t border-gray-200 pt-4">{footer}</div> : null}
    </section>
  );
};

export default BuilderCard;
