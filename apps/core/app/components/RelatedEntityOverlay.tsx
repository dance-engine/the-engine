'use client';

import Spinner from "@dance-engine/ui/general/Spinner";
import type { ReactNode } from "react";
import EntityDetailsCard from "./EntityDetailsCard";

interface RelatedEntityOverlayProps {
  open: boolean;
  title: string;
  subtitle?: string;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  emptyMessage?: string;
  record?: Record<string, unknown>;
  fieldKeys: readonly string[];
  onClose: () => void;
  formatLabel: (key: string) => string;
  renderValue: (key: string, value: unknown) => ReactNode;
}

const RelatedEntityOverlay = ({
  open,
  title,
  subtitle,
  isLoading,
  hasError,
  errorMessage = "Failed to load the details.",
  emptyMessage = "Related item not found.",
  record,
  fieldKeys,
  onClose,
  formatLabel,
  renderValue,
}: RelatedEntityOverlayProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-700">
              <Spinner className="w-5 h-5" /> Loading details...
            </div>
          ) : hasError ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : !record ? (
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              {emptyMessage}
            </div>
          ) : (
            <EntityDetailsCard
              title={title}
              record={record}
              fieldKeys={fieldKeys}
              formatLabel={formatLabel}
              renderValue={renderValue}
              className="rounded-none border-0 bg-transparent p-0 shadow-none"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RelatedEntityOverlay;
