import type { ReactNode } from "react";
import DataLoading from "./DataLoading";
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
    <section className="flex h-full min-h-0 justify-center">
      <div className="flex h-full min-h-0 w-full max-w-4xl flex-col justify-between text-2xl font-semibold text-primary-text-highlight">
        <TopActionBar title={title} subtitle={subtitle} onBack={onBack} />

        <div className="flex-1">
          {loading ? <DataLoading fullHeight={true}/> : null}
          {!loading && items.length === 0 ? (
            emptyState ?? <p className="flex w-full justify-center h-full items-center text-xl">{emptyLabel}</p>
          ) : items.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              type="button"
              onClick={() => onSelect(item.id)}
              className="flex w-full cursor-pointer p-4 items-start justify-between border-b border-uberdark-background text-left transition-colors last:border-b-0 hover:bg-uberdark/5"
            >
              <div>
                <p className="text-sm font-semibold text-primary-text-highlight">{item.label}</p>
                {item.description ? <p className="mt-1 text-xs text-slate-300">{item.description} </p> : null}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
