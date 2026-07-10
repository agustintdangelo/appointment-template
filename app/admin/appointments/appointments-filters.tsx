"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { t, type AppLocale } from "@/lib/i18n";
import type { AdminAppointmentStatusFilter } from "@/lib/queries";

type StaffOption = {
  id: string;
  name: string;
  isActive: boolean;
};

type AppointmentsFiltersProps = {
  locale: AppLocale;
  staffOptions: StaffOption[];
  initialSearch: string;
  initialStatus: AdminAppointmentStatusFilter;
  initialStaffId: string;
  initialFrom: string;
  initialTo: string;
};

const STATUS_OPTIONS: AdminAppointmentStatusFilter[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
];

function statusLabel(locale: AppLocale, status: AdminAppointmentStatusFilter) {
  if (status === "ALL") return t(locale, "common.all");
  if (status === "PENDING") return t(locale, "common.statusPending");
  if (status === "CONFIRMED") return t(locale, "common.statusConfirmed");
  if (status === "CANCELLED") return t(locale, "common.statusCancelled");
  return t(locale, "common.statusCompleted");
}

export default function AppointmentsFilters({
  locale,
  staffOptions,
  initialSearch,
  initialStatus,
  initialStaffId,
  initialFrom,
  initialTo,
}: AppointmentsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<AdminAppointmentStatusFilter>(initialStatus);
  const [staffId, setStaffId] = useState(initialStaffId);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const hasFilters =
    search.trim().length > 0 ||
    status !== "ALL" ||
    staffId !== "" ||
    from !== "" ||
    to !== "";

  function pushParams(nextParams: URLSearchParams) {
    const queryString = nextParams.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    const setOrDelete = (key: string, value: string) => {
      if (value.trim()) {
        next.set(key, value.trim());
      } else {
        next.delete(key);
      }
    };
    setOrDelete("q", search);
    if (status === "ALL") {
      next.delete("status");
    } else {
      next.set("status", status);
    }
    setOrDelete("staff", staffId);
    setOrDelete("from", from);
    setOrDelete("to", to);
    next.delete("page");
    pushParams(next);
  }

  function handleReset() {
    setSearch("");
    setStatus("ALL");
    setStaffId("");
    setFrom("");
    setTo("");
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    ["q", "status", "staff", "from", "to", "page"].forEach((key) => next.delete(key));
    pushParams(next);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="admin-panel p-6"
      data-locale-section=""
      data-locale-section-order="2"
    >
      <div className="grid gap-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(18rem,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "admin.appointments.searchLabel")}
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
                name="q"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t(locale, "admin.appointments.searchPlaceholder")}
                className="admin-input admin-input-with-leading-icon h-14 rounded-[1rem] text-base"
              />
            </div>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "common.status")}
            <div className="relative">
              <select
                name="status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as AdminAppointmentStatusFilter)
                }
                className="admin-select admin-select-with-trailing-icon h-14 appearance-none text-base font-semibold"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {statusLabel(locale, option)}
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

          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "common.staff")}
            <div className="relative">
              <select
                name="staff"
                value={staffId}
                onChange={(event) => setStaffId(event.target.value)}
                className="admin-select admin-select-with-trailing-icon h-14 appearance-none text-base font-semibold"
              >
                <option value="">{t(locale, "common.allStaff")}</option>
                {staffOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                    {option.isActive ? "" : t(locale, "common.inactiveSuffix")}
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
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "admin.appointments.dateFrom")}
            <input
              type="date"
              name="from"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              max={to || undefined}
              className="admin-input h-14 rounded-[1rem] text-base"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "admin.appointments.dateTo")}
            <input
              type="date"
              name="to"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              min={from || undefined}
              className="admin-input h-14 rounded-[1rem] text-base"
            />
          </label>

          <div className="flex flex-wrap items-end gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="admin-button-primary h-14 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending
                ? t(locale, "admin.appointments.applying")
                : t(locale, "admin.appointments.applyFilters")}
            </button>
            {hasFilters ? (
              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="admin-button-secondary h-14 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t(locale, "common.clearFilters")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}
