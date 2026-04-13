"use client";

import { SparklesIcon } from "./Icons";

export default function EventTicketCard({
  title,
  description,
  includes,
  price,
  priceName,
  savingsLabel,
  selected,
  included,
  highlighted = false,
  disabled = false,
  actionLabel,
  onClick,
}: {
  title: string;
  description?: string;
  includes?: string[];
  price: string;
  priceName: string;
  savingsLabel?: string;
  selected: boolean;
  included: boolean;
  highlighted?: boolean;
  disabled?: boolean;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex h-full min-h-[220px] flex-col overflow-hidden rounded-xl px-6 py-5 text-left transition ${
        disabled ? "cursor-not-allowed opacity-85" : "cursor-pointer hover:-translate-y-0.5"
      }`}
      style={{
        backgroundColor: disabled
          ? "color-mix(in srgb, var(--scheme-panel-bg) 90%, grey)"
          : selected
            ? "color-mix(in srgb, var(--scheme-panel-bg) 88%, black)"
            : "color-mix(in srgb, var(--scheme-panel-bg) 100%, black)",
        color: disabled
          ? "color-mix(in srgb, var(--scheme-panel-text) 90%, grey)"
          : "var(--scheme-panel-text)",
        outline: disabled
          ? "1px solid color-mix(in srgb, grey 50%, transparent)"
          : selected
            ? "2px solid var(--highlight-color)"
            : "1px solid color-mix(in srgb, var(--scheme-panel-text) 8%, transparent)",
        outlineOffset: "-1px",
      }}
    >
      { disabled ? <div className="w-full h-full bg-black/50 absolute -mx-6 -my-5 flex justify-center items-center text-3xl font-bold">Sold Out</div> : null}
      {highlighted ? (
        <div className="absolute right-4 top-4 inline-flex items-center gap-2 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--highlight-color)]">
          <SparklesIcon className="h-4 w-4" />
          Highlighted pass
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <p className="text-xl font-black uppercase text-[var(--highlight-color)]">
              {title}
            </p>
            <p
              className="mt-3 text-sm leading-6"
              style={{
                color: selected
                  ? "var(--scheme-panel-text)"
                  : "color-mix(in srgb, var(--scheme-panel-text) 88%, transparent)",
              }}
            >
              {description || " "}
            </p>
          </div>
          <div className="shrink-0 md:min-w-[96px]">
            {priceName !== "Default" && (
              <p className="text-right text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--highlight-color)]">
                {priceName}
              </p>
            )}
            <p className="text-4xl font-black tracking-tight">{price}</p>
            {savingsLabel ? (
              <p className="mt-1 text-sm font-black text-[var(--highlight-color)]">
                {savingsLabel}
              </p>
            ) : null}
          </div>
        </div>

        {includes && includes.length > 0 ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--highlight-color)]">
              Includes
            </p>
            <ul
              className="mt-3 grid gap-2 text-sm"
              style={{
                color:
                  "color-mix(in srgb, var(--scheme-panel-text) 92%, transparent)",
              }}
            >
              {includes.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-md"
                    style={{ backgroundColor: "var(--highlight-color)" }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-4 pt-2">
          <div
            className="min-h-[1.25rem] text-sm font-semibold"
            style={{
              color:
                included && !selected
                  ? "var(--scheme-panel-muted)"
                  : "transparent",
            }}
          >
            {included && !selected ? "Included in a selected bundle" : ""}
          </div>
          <span
            className="inline-flex rounded-md px-4 py-2 text-sm font-semibold"
            style={{
              backgroundColor: selected
                ? "var(--highlight-color)"
                : "transparent",
              color: selected
                ? "var(--scheme-action-text)"
                : "var(--scheme-panel-text)",
              outline: `1px solid ${selected ? "var(--highlight-color)" : "color-mix(in srgb, var(--scheme-panel-text) 22%, transparent)"}`,
            }}
          >
            {included && !selected ? "Included" : actionLabel}
          </span>
        </div>
      </div>
    </button>
  );
}
