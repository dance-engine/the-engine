import type { ReactNode } from "react";
import TopActionBar from "./TopActionBar";

type SelectionItem = {
  id: string;
  label: string;
  description?: string;
};

type SelectionListProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  items: SelectionItem[];
  loading?: boolean;
  emptyLabel?: string;
  emptyState?: ReactNode;
  onSelect: (itemId: string) => void;
};

export default function SelectionList({
  title,
  subtitle,
  onBack,
  items,
  loading = false,
  emptyLabel = "No options found",
  emptyState,
  onSelect,
}: SelectionListProps) {
  return (
    <section className="flex justify-center">
      <div className="w-full max-w-xl justify-between gap-3 text-2xl font-semibold text-primary-text-highlight">
        <TopActionBar title={title} subtitle={subtitle} onBack={onBack} />

        <div className="mt-3 border-y border-white/15">
          {loading ? <p className="text-sm text-slate-600">Loading...</p> : null}
          {!loading && items.length === 0 ? (
            emptyState ?? <p className="py-4 text-xl">{emptyLabel}</p>
          ) : null}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className="flex w-full items-start justify-between border-b border-white/15 px-1 py-3 text-left transition-colors last:border-b-0 hover:bg-white/5"
            >
              <div>
                <p className="text-sm font-semibold text-primary-text-highlight">{item.label}</p>
                {item.description ? <p className="mt-1 text-xs text-slate-300">{item.description}</p> : null}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
