"use client";

import type { ReactNode } from "react";
import { useEffect, useId } from "react";

type CreateEntityModalProps = {
  eyebrow: string;
  title: string;
  description: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export default function CreateEntityModal({
  eyebrow,
  title,
  description,
  isOpen,
  onClose,
  children,
}: CreateEntityModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
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
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 flex max-h-[min(92vh,58rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-border bg-card/98 shadow-[0_36px_110px_-55px_rgba(34,29,24,0.58)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
                {eyebrow}
              </p>
              <h2 id={titleId} className="mt-3 font-display text-4xl">
                {title}
              </h2>
              <p id={descriptionId} className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                {description}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent"
            >
              Close
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-6 sm:px-7">{children}</div>
      </div>
    </div>
  );
}
