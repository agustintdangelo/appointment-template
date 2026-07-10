import Link from "next/link";

import AppointmentsFilters from "@/app/admin/appointments/appointments-filters";
import AppointmentsList from "@/app/admin/appointments/appointments-list";
import {
  AdminEmptyState,
  AdminPageIntro,
  readSearchParamValue,
} from "@/app/admin/admin-ui";
import LocalizedSection from "@/app/components/localized-section";
import { t } from "@/lib/i18n";
import { getBusinessLocale } from "@/lib/locale-server";
import {
  ADMIN_APPOINTMENTS_DEFAULT_PAGE_SIZE,
  getAdminAppointments,
  isAdminAppointmentStatus,
  type AdminAppointmentStatusFilter,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function parseDateInput(value: string | undefined, boundary: "start" | "end"): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const [year, month, day] = value.split("-").map(Number);
  const suffix = boundary === "start" ? [0, 0, 0, 0] : [23, 59, 59, 999];
  const parsed = new Date(year, month - 1, day, suffix[0], suffix[1], suffix[2], suffix[3]);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parsePage(value: string | undefined): number {
  if (!value) return 1;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function buildPageHref(pathname: string, params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  if (page <= 1) {
    next.delete("page");
  } else {
    next.set("page", String(page));
  }
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default async function AdminAppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { businessSlug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};

  const searchValue = readSearchParamValue(resolvedSearchParams.q)?.trim() ?? "";
  const statusRaw = readSearchParamValue(resolvedSearchParams.status);
  const status: AdminAppointmentStatusFilter = isAdminAppointmentStatus(statusRaw)
    ? statusRaw
    : "ALL";
  const staffId = readSearchParamValue(resolvedSearchParams.staff)?.trim() ?? "";
  const fromInput = readSearchParamValue(resolvedSearchParams.from) ?? "";
  const toInput = readSearchParamValue(resolvedSearchParams.to) ?? "";
  const page = parsePage(readSearchParamValue(resolvedSearchParams.page));

  const data = await getAdminAppointments(businessSlug, {
    search: searchValue,
    status,
    staffId: staffId || undefined,
    from: parseDateInput(fromInput, "start"),
    to: parseDateInput(toInput, "end"),
    page,
    pageSize: ADMIN_APPOINTMENTS_DEFAULT_PAGE_SIZE,
  });
  const locale = getBusinessLocale(data?.business.defaultLocale);

  if (!data) {
    return (
      <AdminEmptyState
        title={t(locale, "admin.appointments.emptyTitle")}
        description={t(locale, "admin.noticeSeedBusiness")}
      />
    );
  }

  const hasFilters =
    searchValue.length > 0 ||
    status !== "ALL" ||
    staffId.length > 0 ||
    fromInput.length > 0 ||
    toInput.length > 0;

  const preservedParams = new URLSearchParams();
  if (searchValue) preservedParams.set("q", searchValue);
  if (status !== "ALL") preservedParams.set("status", status);
  if (staffId) preservedParams.set("staff", staffId);
  if (fromInput) preservedParams.set("from", fromInput);
  if (toInput) preservedParams.set("to", toInput);

  const pathname = `/admin/${businessSlug}/appointments`;
  const { pagination } = data;
  const currentPage = pagination.page;
  const previousHref =
    currentPage > 1 ? buildPageHref(pathname, preservedParams, currentPage - 1) : null;
  const nextHref =
    currentPage < pagination.pageCount
      ? buildPageHref(pathname, preservedParams, currentPage + 1)
      : null;

  return (
    <>
      <AdminPageIntro
        eyebrow={t(locale, "admin.appointments.eyebrow")}
        title={t(locale, "admin.appointments.title", { businessName: data.business.name })}
        description={t(locale, "admin.appointments.description")}
      />

      <AppointmentsFilters
        key={`${searchValue}|${status}|${staffId}|${fromInput}|${toInput}`}
        locale={locale}
        staffOptions={data.staffMembers}
        initialSearch={searchValue}
        initialStatus={status}
        initialStaffId={staffId}
        initialFrom={fromInput}
        initialTo={toInput}
      />

      <LocalizedSection as="section" order={3} className="admin-list-shell">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4 text-sm text-muted">
          <span>
            {t(locale, "admin.appointments.resultsSummary", {
              visible: data.appointments.length,
              total: pagination.totalCount,
            })}
          </span>
          {pagination.pageCount > 1 ? (
            <span>
              {t(locale, "admin.appointments.pageIndicator", {
                page: currentPage,
                pageCount: pagination.pageCount,
              })}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-[1.15fr_0.9fr_0.9fr_0.6fr] gap-4 border-b border-border px-6 py-4 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          <p>{t(locale, "common.customer")}</p>
          <p>{t(locale, "common.appointment")}</p>
          <p>{t(locale, "common.staff")}</p>
          <p>{t(locale, "common.status")}</p>
        </div>

        {data.appointments.length === 0 ? (
          <div className="px-6 py-10 text-sm text-muted">
            {hasFilters
              ? t(locale, "admin.appointments.noMatches")
              : t(locale, "admin.appointments.noAppointments")}
          </div>
        ) : (
          <AppointmentsList
            appointments={data.appointments}
            staffMembers={data.staffMembers}
            businessSlug={businessSlug}
            locale={locale}
          />
        )}

        {pagination.pageCount > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4 text-sm">
            {previousHref ? (
              <Link href={previousHref} className="admin-button-secondary">
                {t(locale, "common.previous")}
              </Link>
            ) : (
              <span className="admin-button-secondary pointer-events-none opacity-40">
                {t(locale, "common.previous")}
              </span>
            )}
            <span className="text-muted">
              {t(locale, "admin.appointments.pageIndicator", {
                page: currentPage,
                pageCount: pagination.pageCount,
              })}
            </span>
            {nextHref ? (
              <Link href={nextHref} className="admin-button-secondary">
                {t(locale, "common.next")}
              </Link>
            ) : (
              <span className="admin-button-secondary pointer-events-none opacity-40">
                {t(locale, "common.next")}
              </span>
            )}
          </div>
        ) : null}
      </LocalizedSection>
    </>
  );
}
