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

type PersistedLanguageSaveState = {
  phase: "loading" | "saved";
  message: string | null;
  expiresAt?: number;
};

type LanguageSaveButtonPhase = "idle" | "loading" | "saved";

const LANGUAGE_SAVE_STATE_EVENT = "appointment-language-save-state";

function getLanguageSaveStateStorageKey(businessSlug: string) {
  return `appointment-language-save-state:${businessSlug}`;
}

function readPersistedLanguageSaveState(
  businessSlug: string,
): PersistedLanguageSaveState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedState = window.sessionStorage.getItem(
    getLanguageSaveStateStorageKey(businessSlug),
  );

  if (!storedState) {
    return null;
  }

  try {
    const parsedState = JSON.parse(storedState) as PersistedLanguageSaveState;

    if (parsedState.phase !== "loading" && parsedState.phase !== "saved") {
      return null;
    }

    if (
      parsedState.phase === "saved" &&
      parsedState.expiresAt &&
      parsedState.expiresAt <= Date.now()
    ) {
      clearPersistedLanguageSaveState(businessSlug);
      return null;
    }

    return parsedState;
  } catch {
    clearPersistedLanguageSaveState(businessSlug);
    return null;
  }
}

function writePersistedLanguageSaveState(
  businessSlug: string,
  state: PersistedLanguageSaveState,
) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = getLanguageSaveStateStorageKey(businessSlug);
  window.sessionStorage.setItem(storageKey, JSON.stringify(state));
  window.dispatchEvent(
    new CustomEvent(LANGUAGE_SAVE_STATE_EVENT, {
      detail: { storageKey, state },
    }),
  );
}

function clearPersistedLanguageSaveState(businessSlug: string) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = getLanguageSaveStateStorageKey(businessSlug);
  window.sessionStorage.removeItem(storageKey);
  window.dispatchEvent(
    new CustomEvent(LANGUAGE_SAVE_STATE_EVENT, {
      detail: { storageKey, state: null },
    }),
  );
}

function SaveLanguageButton({
  locale,
  phase,
  savedMessage,
}: {
  locale: AppLocale;
  phase: LanguageSaveButtonPhase;
  savedMessage: string | null;
}) {
  const { pending } = useFormStatus();
  const isLoading = pending || phase === "loading";
  const isSaved = phase === "saved";
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
  const [buttonPhase, setButtonPhase] = useState<LanguageSaveButtonPhase>("idle");
  const [savedButtonMessage, setSavedButtonMessage] = useState<string | null>(null);
  const savedResetTimerRef = useRef<number | null>(null);
  const [state, action] = useActionState(
    updateDefaultLocaleAction,
    initialAdminEntityActionState,
  );
  const handledSuccessStateRef = useRef<typeof state | null>(null);

  useEffect(() => {
    setSelectedLocale(defaultLocale);
  }, [defaultLocale]);

  useEffect(() => {
    const applyPersistedState = (persistedState: PersistedLanguageSaveState | null) => {
      if (savedResetTimerRef.current) {
        window.clearTimeout(savedResetTimerRef.current);
        savedResetTimerRef.current = null;
      }

      if (!persistedState) {
        setButtonPhase("idle");
        setSavedButtonMessage(null);
        return;
      }

      if (persistedState.phase === "loading") {
        setButtonPhase("loading");
        setSavedButtonMessage(null);
        return;
      }

      setButtonPhase("saved");
      setSavedButtonMessage(persistedState.message);

      const remainingDuration = Math.max(
        0,
        (persistedState.expiresAt ?? Date.now() + 2000) - Date.now(),
      );

      savedResetTimerRef.current = window.setTimeout(() => {
        clearPersistedLanguageSaveState(businessSlug);
        setButtonPhase("idle");
        setSavedButtonMessage(null);
        savedResetTimerRef.current = null;
      }, remainingDuration);
    };

    applyPersistedState(readPersistedLanguageSaveState(businessSlug));

    const handlePersistedStateChange = (event: Event) => {
      const customEvent = event as CustomEvent<{
        storageKey: string;
        state: PersistedLanguageSaveState | null;
      }>;

      if (
        customEvent.detail?.storageKey !== getLanguageSaveStateStorageKey(businessSlug)
      ) {
        return;
      }

      applyPersistedState(customEvent.detail.state ?? null);
    };

    window.addEventListener(LANGUAGE_SAVE_STATE_EVENT, handlePersistedStateChange);

    return () => {
      window.removeEventListener(
        LANGUAGE_SAVE_STATE_EVENT,
        handlePersistedStateChange,
      );

      if (savedResetTimerRef.current) {
        window.clearTimeout(savedResetTimerRef.current);
      }
    };
  }, [businessSlug]);

  useEffect(() => {
    if (state.status === "success" && state.message) {
      if (handledSuccessStateRef.current === state) {
        return;
      }

      handledSuccessStateRef.current = state;
      writePersistedLanguageSaveState(businessSlug, {
        phase: "loading",
        message: null,
      });

      refreshWithLocaleTransition(() => router.refresh(), {
        onBeforeEnter: () => {
          writePersistedLanguageSaveState(businessSlug, {
            phase: "saved",
            message: state.message,
            expiresAt: Date.now() + 2000,
          });
        },
      });
    } else if (state.status === "error") {
      handledSuccessStateRef.current = null;
      if (savedResetTimerRef.current) {
        window.clearTimeout(savedResetTimerRef.current);
        savedResetTimerRef.current = null;
      }
      clearPersistedLanguageSaveState(businessSlug);
      setButtonPhase("idle");
    }
  }, [businessSlug, router, state]);

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

              clearPersistedLanguageSaveState(businessSlug);
              handledSuccessStateRef.current = null;
              setButtonPhase("idle");
              setSavedButtonMessage(null);
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
          phase={buttonPhase}
          savedMessage={savedButtonMessage}
        />
      </div>
    </form>
  );
}
