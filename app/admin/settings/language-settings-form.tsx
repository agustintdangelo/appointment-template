"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { updateDefaultLocaleAction } from "@/app/admin/actions";
import { initialAdminEntityActionState } from "@/app/admin/components/admin-collection-types";
import { getSupportedLocaleOptions, t, type AppLocale } from "@/lib/i18n";
import { refreshWithLocaleTransition } from "@/lib/locale-transition";

type LanguageSettingsFormProps = {
  locale: AppLocale;
  defaultLocale: AppLocale;
};

function SaveLanguageButton({ locale }: { locale: AppLocale }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? t(locale, "common.saving") : t(locale, "admin.settings.saveLanguage")}
    </button>
  );
}

export default function LanguageSettingsForm({
  locale,
  defaultLocale,
}: LanguageSettingsFormProps) {
  const router = useRouter();
  const [selectedLocale, setSelectedLocale] = useState(defaultLocale);
  const [state, action] = useActionState(
    updateDefaultLocaleAction,
    initialAdminEntityActionState,
  );

  useEffect(() => {
    setSelectedLocale(defaultLocale);
  }, [defaultLocale]);

  useEffect(() => {
    if (state.status === "success") {
      refreshWithLocaleTransition(() => router.refresh());
    }
  }, [router, state]);

  return (
    <form action={action} className="admin-panel grid gap-5 p-6">
      <input type="hidden" name="locale" value={locale} />

      <div className="grid gap-2 border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
          {t(locale, "admin.settings.localizationEyebrow")}
        </p>
        <h2 className="text-xl font-semibold text-slate-900">
          {t(locale, "admin.settings.localizationTitle")}
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          {t(locale, "admin.settings.localizationDescription")}
        </p>
      </div>

      <label className="grid max-w-md gap-2 text-sm font-medium">
        {t(locale, "admin.settings.defaultLanguage")}
        <div className="relative">
          <select
            name="defaultLocale"
            value={selectedLocale}
            onChange={(event) => setSelectedLocale(event.target.value as AppLocale)}
            className="admin-select admin-select-with-trailing-icon appearance-none text-base font-semibold"
          >
            {getSupportedLocaleOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-900">
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
        {state.fieldErrors.defaultLocale ? (
          <p className="text-sm text-rose-700">{state.fieldErrors.defaultLocale}</p>
        ) : null}
      </label>

      <p className="max-w-2xl text-sm leading-7 text-muted">
        {t(locale, "admin.settings.currentBehavior")}
      </p>

      {state.status === "error" && state.message ? (
        <div className="admin-error-banner">{state.message}</div>
      ) : null}

      {state.status === "success" && state.message ? (
        <div className="admin-success-banner">{state.message}</div>
      ) : null}

      <div>
        <SaveLanguageButton locale={locale} />
      </div>
    </form>
  );
}
