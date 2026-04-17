'use client'

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { IoChevronDown, IoCloseCircle, IoSearch } from "react-icons/io5";

export interface SearchableEntityOption<T> {
  key: string;
  title: string;
  subtitle?: string;
  caption?: string;
  searchText?: string;
  value: T;
}

interface SearchableEntityPickerProps<T> {
  label: string;
  placeholder: string;
  value: string;
  options: SearchableEntityOption<T>[];
  selectedKey?: string;
  onValueChange: (value: string) => void;
  onSelect: (option: SearchableEntityOption<T>) => void;
  onClear?: () => void;
  emptyMessage: string;
  loading?: boolean;
  errorMessage?: string;
  minChars?: number;
  maxVisibleOptions?: number;
  labelAside?: ReactNode;
}

const SearchableEntityPicker = <T,>({
  label,
  placeholder,
  value,
  options,
  selectedKey,
  onValueChange,
  onSelect,
  onClear,
  emptyMessage,
  loading = false,
  errorMessage,
  minChars = 3,
  maxVisibleOptions = 6,
  labelAside,
}: SearchableEntityPickerProps<T>) => {
  const [hasFocus, setHasFocus] = useState(false);
  const [showAllOptions, setShowAllOptions] = useState(false);

  const visibleOptions = useMemo(() => {
    const normalizedQuery = value.trim().toLowerCase();
    const filteredOptions =
      showAllOptions
        ? options
        : normalizedQuery.length >= minChars
        ? options.filter((option) =>
            [option.title, option.subtitle, option.caption, option.searchText]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery),
          )
        : options;

    return filteredOptions.slice(0, maxVisibleOptions);
  }, [maxVisibleOptions, minChars, options, showAllOptions, value]);

  const showPrompt = value.trim().length > 0 && value.trim().length < minChars;
  const shouldShowDropdown =
    !errorMessage && ((hasFocus && value.trim().length >= minChars) || showAllOptions);

  return (
    <div className={`relative ${shouldShowDropdown ? "z-40" : "z-0"}`}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {labelAside ? <div className="text-xs text-gray-500">{labelAside}</div> : null}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="grid grid-cols-1">
          <IoSearch
            aria-hidden="true"
            className="pointer-events-none col-start-1 row-start-1 ml-3 mt-3 size-4 self-start text-gray-400"
          />
          <input
            type="search"
            aria-label={label}
            placeholder={placeholder}
            className="col-start-1 row-start-1 block w-full rounded-lg py-2.5 pl-9 pr-16 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            value={value}
            onFocus={() => setHasFocus(true)}
            onBlur={() => {
              window.setTimeout(() => {
                setHasFocus(false);
              }, 100);
            }}
            onChange={(event) => {
              onValueChange(event.target.value);
              setShowAllOptions(false);
            }}
          />
          <div className="col-start-1 row-start-1 mr-2 mt-2 ml-auto flex items-center gap-1 self-start">
            {value ? (
              <button
                type="button"
                onClick={() => {
                  onClear?.();
                  onValueChange("");
                  setShowAllOptions(false);
                  setHasFocus(true);
                }}
                className="rounded p-1 text-gray-400 hover:text-gray-600"
                aria-label={`Clear ${label.toLowerCase()}`}
              >
                <IoCloseCircle className="size-4" />
              </button>
            ) : null}
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setShowAllOptions((current) => !current);
                setHasFocus(false);
              }}
              className="rounded p-1 text-gray-400 hover:text-gray-600"
              aria-label={`Toggle ${label.toLowerCase()} options`}
            >
              <IoChevronDown className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {shouldShowDropdown ? (
        <div className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-2xl">
          {loading ? <p className="px-4 py-4 text-sm text-gray-500">Loading options…</p> : null}
          {!loading ? (
            <div className="py-2">
              {showPrompt ? (
                <p className="px-4 py-2 text-sm text-gray-500">Keep typing to narrow the list.</p>
              ) : null}

              {visibleOptions.length > 0 ? (
                visibleOptions.map((option) => {
                  const isSelected = option.key === selectedKey;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        onSelect(option);
                        setHasFocus(false);
                        setShowAllOptions(false);
                      }}
                      className={`flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition ${
                        isSelected ? "bg-keppel-on-light/5" : "hover:bg-gray-50"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{option.title}</p>
                        {option.subtitle ? <p className="mt-1 text-sm text-gray-600">{option.subtitle}</p> : null}
                      </div>
                      {option.caption ? (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                          {option.caption}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <p className="px-4 py-4 text-sm text-gray-500">{emptyMessage}</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default SearchableEntityPicker;
