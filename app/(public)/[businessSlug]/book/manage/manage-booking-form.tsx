"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { t, type AppLocale } from "@/lib/i18n";

import { findBookingAction } from "./actions";

export type ManageBookingLookupActionState = {
  status: "idle" | "error";
  message: string | null;
};

const initialManageBookingLookupActionState: ManageBookingLookupActionState = {
  status: "idle",
  message: null,
};

function FindBookingButton({ locale }: { locale: AppLocale }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="brand-accent-fill localized-action mt-8 rounded-full px-6 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? t(locale, "public.manage.finding") : t(locale, "public.manage.find")}
    </button>
  );
}

export default function ManageBookingForm({
  businessSlug,
  locale,
}: {
  businessSlug: string;
  locale: AppLocale;
}) {
  const [state, formAction] = useActionState(
    findBookingAction,
    initialManageBookingLookupActionState,
  );

  return (
    <form
      action={formAction}
      className="brand-panel-shadow rounded-[2rem] border border-border bg-card/95 p-8"
    >
      <input type="hidden" name="businessSlug" value={businessSlug} />
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          {t(locale, "public.manage.confirmationCode")}
          <input
            name="confirmationCode"
            required
            className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          {t(locale, "common.email")}
          <input
            name="customerEmail"
            type="email"
            required
            className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
          />
        </label>
      </div>

      {state.status === "error" && state.message ? (
        <p className="mt-6 rounded-2xl bg-highlight-surface px-4 py-3 text-sm text-highlight-foreground">
          {state.message}
        </p>
      ) : null}

      <FindBookingButton locale={locale} />
    </form>
  );
}
