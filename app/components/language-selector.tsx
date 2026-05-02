"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  PUBLIC_LOCALE_COOKIE,
  PUBLIC_LOCALE_STORAGE_KEY,
  getSupportedLocaleOptions,
  isSupportedLocale,
  normalizeLocale,
  t,
  type AppLocale,
} from "@/lib/i18n";
import { refreshWithLocaleTransition } from "@/lib/locale-transition";

type LanguageSelectorProps = {
  locale: AppLocale;
};

function persistPublicLocale(locale: AppLocale) {
  document.cookie = `${PUBLIC_LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  window.localStorage.setItem(PUBLIC_LOCALE_STORAGE_KEY, locale);
}

export default function LanguageSelector({ locale }: LanguageSelectorProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();
  const [selectedLocale, setSelectedLocale] = useState(locale);
  const [isOpen, setIsOpen] = useState(false);
  const options = getSupportedLocaleOptions();

  useEffect(() => {
    setSelectedLocale(locale);
  }, [locale]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(PUBLIC_LOCALE_STORAGE_KEY);

    if (!isSupportedLocale(storedLocale) || storedLocale === locale) {
      return;
    }

    persistPublicLocale(storedLocale);
    setSelectedLocale(storedLocale);
    startTransition(() => refreshWithLocaleTransition(() => router.refresh()));
  }, [locale, router]);

  function handleLocaleChange(value: string) {
    const nextLocale = normalizeLocale(value);

    setIsOpen(false);
    setSelectedLocale(nextLocale);
    persistPublicLocale(nextLocale);
    startTransition(() => refreshWithLocaleTransition(() => router.refresh()));
  }

  return (
    <div ref={menuRef} className="relative z-[90]">
      <button
        type="button"
        aria-label={t(locale, "common.language")}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        className="inline-flex h-9 min-w-20 items-center justify-center gap-1.5 rounded-full border border-border/80 bg-card/70 px-2.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted transition hover:border-accent hover:text-foreground focus:border-accent focus:outline-none"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="10" cy="10" r="7" />
          <path d="M3.5 10h13" />
          <path d="M10 3a10.5 10.5 0 0 1 0 14" />
          <path d="M10 3a10.5 10.5 0 0 0 0 14" />
        </svg>
        <span>{selectedLocale.toUpperCase()}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`h-3.5 w-3.5 transition ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 7.5 5 5 5-5" />
        </svg>
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-full z-[100] mt-2 min-w-36 overflow-hidden rounded-2xl border border-border bg-card p-1 text-sm shadow-lg">
          {options.map((option) => {
            const isSelected = option.value === selectedLocale;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleLocaleChange(option.value)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                  isSelected
                    ? "bg-surface font-semibold text-foreground"
                    : "text-muted hover:bg-surface hover:text-foreground"
                }`}
              >
                <span>{option.label}</span>
                {isSelected ? (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 10 3 3 7-7" />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
