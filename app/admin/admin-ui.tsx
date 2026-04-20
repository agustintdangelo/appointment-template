import Link from "next/link";
import type { ReactNode } from "react";

import { adminNavItems } from "@/lib/admin";

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

export function AdminNav() {
  return (
    <nav className="flex flex-wrap gap-3">
      {adminNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="admin-button-secondary text-sm font-medium"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
