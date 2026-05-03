"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { updateDefaultLocaleAction } from "@/app/admin/actions";
import { initialAdminEntityActionState } from "@/app/admin/components/admin-collection-types";
import { getSupportedLocaleOptions, t, type AppLocale } from "@/lib/i18n";
import { refreshWithLocaleTransition } from "@/lib/locale-transition";

type LanguageSettingsFormProps = {
  businessSlug: string;
  locale: AppLocale;
  defaultLocale: AppLocale;
};

function SaveLanguageButton({
  locale,
  isSaved,
  isTransitioning,
  savedMessage,
}: {
  locale: AppLocale;
  isSaved: boolean;
  isTransitioning: boolean;
  savedMessage: string | null;
}) {
  const { pending } = useFormStatus();
  const isLoading = pending || isTransitioning;
  const label = isLoading
    ? t(locale, "common.saving")
    : isSaved && savedMessage
      ? savedMessage
      : t(locale, "admin.settings.saveLanguage");

  return (
    <button
      type="submit"
      disabled={isLoading}
      aria-busy={isLoading}
      className={`inline-grid h-11 w-44 place-items-center rounded-full px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        isSaved
          ? "bg-emerald-600 text-white hover:bg-emerald-600"
          : "bg-slate-900 text-white hover:bg-slate-800"
        }`}
    >
      <span className="flex min-w-0 items-center justify-center gap-2">
        {isLoading ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/35 border-t-white"
          />
        ) : null}
        <span className="truncate">{label}</span>
      </span>
    </button>
  );
}

export default function LanguageSettingsForm({
  businessSlug,
  locale,
  defaultLocale,
}: LanguageSettingsFormProps) {
  const router = useRouter();
  const [selectedLocale, setSelectedLocale] = useState(defaultLocale);
  const [savedButtonMessage, setSavedButtonMessage] = useState<string | null>(null);
  const [isLocaleTransitioning, setIsLocaleTransitioning] = useState(false);
  const savedResetTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const [state, action] = useActionState(
    updateDefaultLocaleAction,
    initialAdminEntityActionState,
  );
  const handledSuccessStateRef = useRef<typeof state | null>(null);
  const transitionResultIdRef = useRef(0);

  useEffect(() => {
    setSelectedLocale(defaultLocale);
  }, [defaultLocale]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      if (savedResetTimerRef.current) {
        window.clearTimeout(savedResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (state.status === "success" && state.message) {
      if (handledSuccessStateRef.current === state) {
        return;
      }

      handledSuccessStateRef.current = state;
      transitionResultIdRef.current += 1;
      const currentTransitionResultId = transitionResultIdRef.current;

      if (savedResetTimerRef.current) {
        window.clearTimeout(savedResetTimerRef.current);
        savedResetTimerRef.current = null;
      }

      setSavedButtonMessage(null);
      setIsLocaleTransitioning(true);

      refreshWithLocaleTransition(() => router.refresh(), {
        onBeforeEnter: () => {
          if (
            !isMountedRef.current ||
            currentTransitionResultId !== transitionResultIdRef.current
          ) {
            return;
          }

          setIsLocaleTransitioning(false);
          setSavedButtonMessage(state.message);
        },
        onComplete: () => {
          if (
            !isMountedRef.current ||
            currentTransitionResultId !== transitionResultIdRef.current
          ) {
            return;
          }

          savedResetTimerRef.current = window.setTimeout(() => {
            if (!isMountedRef.current) {
              return;
            }

            setSavedButtonMessage(null);
            savedResetTimerRef.current = null;
          }, 2000);
        },
      });
    } else if (state.status === "error") {
      handledSuccessStateRef.current = null;
      setIsLocaleTransitioning(false);
    }
  }, [router, state]);

  return (
    <form
      action={action}
      data-locale-section=""
      data-locale-section-order="2"
      className="admin-panel grid gap-5 p-6"
    >
      <input type="hidden" name="businessSlug" value={businessSlug} />
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
            onChange={(event) => {
              if (savedResetTimerRef.current) {
                window.clearTimeout(savedResetTimerRef.current);
                savedResetTimerRef.current = null;
              }

              transitionResultIdRef.current += 1;
              setSavedButtonMessage(null);
              setIsLocaleTransitioning(false);
              setSelectedLocale(event.target.value as AppLocale);
            }}
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

      <div>
        <SaveLanguageButton
          locale={locale}
          isSaved={!!savedButtonMessage}
          isTransitioning={isLocaleTransitioning}
          savedMessage={savedButtonMessage}
        />
      </div>
    </form>
  );
}
