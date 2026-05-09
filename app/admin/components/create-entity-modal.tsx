"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";

type CreateEntityModalProps = {
  eyebrow: string;
  title: string;
  description: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  closeLabel?: string;
  closeAriaLabel?: string;
};

export default function CreateEntityModal({
  eyebrow,
  title,
  description,
  isOpen,
  onClose,
  children,
  closeLabel = "Close",
  closeAriaLabel = "Close dialog",
}: CreateEntityModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    function getFocusableElements() {
      return Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          [
            "a[href]",
            "button:not([disabled])",
            "textarea:not([disabled])",
            "input:not([disabled])",
            "select:not([disabled])",
            "[tabindex]:not([tabindex='-1'])",
          ].join(","),
        ) ?? [],
      ).filter(
        (element) =>
          !element.hasAttribute("disabled") &&
          element.getAttribute("aria-hidden") !== "true" &&
          element.getClientRects().length > 0,
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => {
      getFocusableElements()[0]?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(34,29,24,0.28)] backdrop-blur-[3px]"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-locale-section=""
        data-locale-section-order="2"
        tabIndex={-1}
        className="admin-panel relative z-10 flex max-h-[min(92vh,58rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[1.25rem] bg-white/98"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
                {eyebrow}
              </p>
              <h2 id={titleId} className="mt-3 text-2xl font-semibold text-slate-900">
                {title}
              </h2>
              <p id={descriptionId} className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                {description}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={closeAriaLabel}
              className="admin-button-secondary"
            >
              {closeLabel}
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-6 sm:px-7">{children}</div>
      </div>
    </div>
  );
}
