import Link from "next/link";
import type { ReactNode } from "react";

import { adminNavItems } from "@/lib/admin";

type SearchParamValue = string | string[] | undefined;
type SearchParamsRecord = Record<string, SearchParamValue>;

export type AdminNoticeState = {
  tone: "success" | "error";
  message: string;
} | null;

function readFirstValue(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export async function getAdminNotice(
  searchParams?: SearchParamsRecord | Promise<SearchParamsRecord>,
): Promise<AdminNoticeState> {
  const resolvedParams = (await searchParams) ?? {};
  const message = readFirstValue(resolvedParams.message);

  if (!message) {
    return null;
  }

  const tone = readFirstValue(resolvedParams.tone) === "error" ? "error" : "success";

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
      className={`rounded-[1.5rem] border px-5 py-4 text-sm ${
        notice.tone === "error"
          ? "border-highlight bg-highlight-surface text-highlight-foreground"
          : "border-border bg-card/90 text-foreground"
      }`}
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
    <section className="rounded-[2rem] border border-border bg-card/95 p-8 shadow-[0_30px_80px_-55px_rgba(34,29,24,0.45)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">{eyebrow}</p>
          <h1 className="mt-4 font-display text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-muted">{description}</p>
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
    <div className="rounded-[2rem] border border-border bg-card/90 px-6 py-10 text-center">
      <h2 className="font-display text-3xl">{title}</h2>
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
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
