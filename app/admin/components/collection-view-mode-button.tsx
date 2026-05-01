import type { AdminCollectionViewMode } from "@/app/admin/components/admin-collection-types";
import { DEFAULT_LOCALE, t, type AppLocale } from "@/lib/i18n";

function ViewModeIcon({ viewMode }: { viewMode: AdminCollectionViewMode }) {
  return (
    <span className="relative block h-5 w-5">
      <span
        className={`absolute inset-0 transition-all duration-300 ease-out ${
          viewMode === "cards"
            ? "translate-x-0 scale-100 opacity-100"
            : "-translate-x-2 scale-75 opacity-0"
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
          <rect x="3" y="3" width="5.5" height="5.5" rx="1.2" />
          <rect x="11.5" y="3" width="5.5" height="5.5" rx="1.2" />
          <rect x="3" y="11.5" width="5.5" height="5.5" rx="1.2" />
          <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.2" />
        </svg>
      </span>
      <span
        className={`absolute inset-0 transition-all duration-300 ease-out ${
          viewMode === "list"
            ? "translate-x-0 scale-100 opacity-100"
            : "translate-x-2 scale-75 opacity-0"
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
          <path d="M5 5.5h11" />
          <path d="M5 10h11" />
          <path d="M5 14.5h11" />
          <circle cx="3" cy="5.5" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="3" cy="10" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="3" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      </span>
    </span>
  );
}

export default function CollectionViewModeButton({
  viewMode,
  onChange,
  locale = DEFAULT_LOCALE,
}: {
  viewMode: AdminCollectionViewMode;
  onChange: (value: AdminCollectionViewMode) => void;
  locale?: AppLocale;
}) {
  const label =
    viewMode === "cards"
      ? t(locale, "admin.collection.switchToList")
      : t(locale, "admin.collection.switchToCards");

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => onChange(viewMode === "cards" ? "list" : "cards")}
      className="flex h-14 w-14 items-center justify-center rounded-[1rem] border border-slate-300 bg-white text-slate-500 transition hover:border-slate-400 hover:text-slate-900"
    >
      <ViewModeIcon viewMode={viewMode} />
    </button>
  );
}
