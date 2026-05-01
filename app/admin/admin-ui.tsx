import Link from "next/link";
import type { ReactNode } from "react";

import { adminNavItems } from "@/lib/admin";
import { DEFAULT_LOCALE, t, type AppLocale } from "@/lib/i18n";

type SearchParamValue = string | string[] | undefined;
type SearchParamsRecord = Record<string, SearchParamValue>;

export type AdminNoticeState = {
  tone: "success" | "error";
  message: string;
} | null;

export function readSearchParamValue(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function buildAdminPath(
  pathname: string,
  params: Record<string, string | null | undefined>,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const normalizedValue = value?.trim();

    if (normalizedValue) {
      searchParams.set(key, normalizedValue);
    }
  }

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export async function getAdminNotice(
  searchParams?: SearchParamsRecord | Promise<SearchParamsRecord>,
): Promise<AdminNoticeState> {
  const resolvedParams = (await searchParams) ?? {};
  const message = readSearchParamValue(resolvedParams.message);

  if (!message) {
    return null;
  }

  const tone = readSearchParamValue(resolvedParams.tone) === "error" ? "error" : "success";

  return {
    tone,
    message,
  };
}

export function AdminNotice({ notice }: { notice: AdminNoticeState }) {
  if (!notice) {
    return null;
  }

  return (
    <div
      className={notice.tone === "error" ? "admin-error-banner" : "admin-success-banner"}
    >
      {notice.message}
    </div>
  );
}

export function AdminPageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="admin-panel p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}

export function AdminEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="admin-panel px-6 py-10 text-center">
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
    </div>
  );
}

export function AdminNav({ locale = DEFAULT_LOCALE }: { locale?: AppLocale }) {
  return (
    <nav className="flex flex-wrap gap-3">
      <Link
        href="/"
        className="admin-button-secondary gap-2 text-sm font-medium"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12.5 4.5 7 10l5.5 5.5" />
          <path d="M7.5 10h8" />
        </svg>
        {t(locale, "common.backToHome")}
      </Link>
      {adminNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="admin-button-secondary text-sm font-medium"
        >
          {t(locale, item.labelKey)}
        </Link>
      ))}
    </nav>
  );
}
