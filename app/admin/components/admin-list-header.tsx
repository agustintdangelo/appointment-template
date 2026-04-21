import type { ReactNode } from "react";

import {
  adminCollectionStatusOptions,
  type AdminCollectionSort,
  type AdminCollectionStatusFilter,
  type AdminCollectionViewMode,
} from "@/app/admin/components/admin-collection-types";
import CollectionViewModeButton from "@/app/admin/components/collection-view-mode-button";

type AdminListHeaderProps = {
  searchLabel: string;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: AdminCollectionStatusFilter;
  onStatusFilterChange: (value: AdminCollectionStatusFilter) => void;
  sortValue: AdminCollectionSort;
  onSortChange: (value: AdminCollectionSort) => void;
  viewMode: AdminCollectionViewMode;
  onViewModeChange: (value: AdminCollectionViewMode) => void;
  summary: ReactNode;
  filtersLabel?: string;
};

function HeaderSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="admin-select admin-select-with-trailing-icon h-14 appearance-none text-base font-semibold"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </span>
      </div>
    </label>
  );
}

function HeaderIconButton({
  label,
  isActive = false,
  onClick,
  children,
}: {
  label: string;
  isActive?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-14 w-14 items-center justify-center rounded-[1rem] border transition ${
        isActive
          ? "border-slate-400 bg-slate-100 text-slate-900"
          : "border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function SortModeIcon({ sortValue }: { sortValue: AdminCollectionSort }) {
  return (
    <span className="relative block h-5 w-5">
      <span
        className={`absolute inset-0 transition-all duration-300 ease-out ${
          sortValue === "default"
            ? "translate-y-0 scale-100 opacity-100"
            : sortValue === "name-asc"
              ? "-translate-y-2 scale-75 opacity-0"
              : "translate-y-2 scale-75 opacity-0"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 4.5v11" />
          <path d="m3.5 7 2.5-2.5L8.5 7" />
          <path d="m3.5 13 2.5 2.5 2.5-2.5" />
          <path d="M11 6.5h6" />
          <path d="M11 10h4.5" />
          <path d="M11 13.5h3" />
        </svg>
      </span>
      <span
        className={`absolute inset-0 transition-all duration-300 ease-out ${
          sortValue === "name-asc"
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-2 scale-75 opacity-0"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 15V5" />
          <path d="m3.5 7.5 2.5-2.5 2.5 2.5" />
          <path d="M11 7h6" />
          <path d="M11 11h4.5" />
          <path d="M11 15h3" />
        </svg>
      </span>
      <span
        className={`absolute inset-0 transition-all duration-300 ease-out ${
          sortValue === "name-desc"
            ? "translate-y-0 scale-100 opacity-100"
            : "-translate-y-2 scale-75 opacity-0"
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 5v10" />
          <path d="m3.5 12.5 2.5 2.5 2.5-2.5" />
          <path d="M11 7h3" />
          <path d="M11 11h4.5" />
          <path d="M11 15h6" />
        </svg>
      </span>
    </span>
  );
}

function getNextSortValue(sortValue: AdminCollectionSort): AdminCollectionSort {
  if (sortValue === "default") {
    return "name-asc";
  }

  if (sortValue === "name-asc") {
    return "name-desc";
  }

  return "default";
}

export default function AdminListHeader({
  searchLabel,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortValue,
  onSortChange,
  viewMode,
  onViewModeChange,
  summary,
  filtersLabel = "Filters",
}: AdminListHeaderProps) {
  return (
    <section className="admin-panel p-6">
      <div className="grid gap-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(18rem,1fr)_minmax(24rem,1fr)] xl:items-end">
          <label className="grid gap-2 text-sm font-medium">
            {searchLabel}
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-muted">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="8.5" cy="8.5" r="4.75" />
                  <path d="m12 12 4.5 4.5" />
                </svg>
              </span>
              <input
                type="search"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="admin-input admin-input-with-leading-icon h-14 rounded-[1rem] text-base"
              />
            </div>
          </label>

          <div className="grid gap-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
              <HeaderSelect
                label={filtersLabel}
                value={statusFilter}
                onChange={(value) => onStatusFilterChange(value as AdminCollectionStatusFilter)}
                options={adminCollectionStatusOptions}
              />

              <div className="grid gap-2 text-sm font-medium">
                <span>Sort</span>
                <div className="flex">
                  <HeaderIconButton
                    label={
                      sortValue === "default"
                        ? "Sort by name"
                        : sortValue === "name-asc"
                          ? "Switch sort to descending"
                          : "Reset sort order"
                    }
                    onClick={() => onSortChange(getNextSortValue(sortValue))}
                  >
                    <SortModeIcon sortValue={sortValue} />
                  </HeaderIconButton>
                </div>
              </div>

              <div className="grid gap-2 text-sm font-medium">
                <span>View</span>
                <div className="flex">
                  <CollectionViewModeButton viewMode={viewMode} onChange={onViewModeChange} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-[1.75rem] text-sm leading-6 text-muted">{summary}</div>
      </div>
    </section>
  );
}
