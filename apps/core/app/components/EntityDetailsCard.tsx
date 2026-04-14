'use client';

import type { ReactNode } from "react";

interface EntityDetailsCardProps {
  title: string;
  description?: string;
  record: Record<string, unknown>;
  fieldKeys: readonly string[];
  formatLabel: (key: string) => string;
  renderValue: (key: string, value: unknown) => ReactNode;
  className?: string;
}

const FieldRow = ({ label, value }: { label: string; value?: ReactNode }) => (
  <div className="border-b border-gray-200 py-3">
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 break-all whitespace-pre-wrap">{value || "-"}</dd>
  </div>
);

const EntityDetailsCard = ({
  title,
  description,
  record,
  fieldKeys,
  formatLabel,
  renderValue,
  className = "rounded-xl border border-gray-200 bg-white p-6 shadow-sm",
}: EntityDetailsCardProps) => {
  return (
    <div className={className}>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
        {fieldKeys.map((key) => (
          <FieldRow
            key={key}
            label={formatLabel(key)}
            value={renderValue(key, record[key])}
          />
        ))}
      </dl>
    </div>
  );
};

export default EntityDetailsCard;
