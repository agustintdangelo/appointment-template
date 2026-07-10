"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { t, type AppLocale } from "@/lib/i18n";

import { cancelAppointmentAction } from "./actions";

export type CancelAppointmentActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

const initialCancelAppointmentActionState: CancelAppointmentActionState = {
  status: "idle",
  message: null,
};

function ConfirmCancelButton({ locale }: { locale: AppLocale }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-rose-600 px-5 py-3 font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending
        ? t(locale, "public.confirmation.cancelling")
        : t(locale, "public.confirmation.confirmCancel")}
    </button>
  );
}

export default function CancelAppointmentButton({
  appointmentId,
  businessSlug,
  locale,
}: {
  appointmentId: string;
  businessSlug: string;
  locale: AppLocale;
}) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [state, formAction] = useActionState(
    cancelAppointmentAction,
    initialCancelAppointmentActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  if (state.status === "success") {
    return (
      <p className="rounded-2xl bg-highlight-surface px-4 py-3 text-sm text-highlight-foreground">
        {state.message}
      </p>
    );
  }

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="localized-action rounded-full border border-border px-5 py-3 font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        {t(locale, "public.confirmation.cancelCta")}
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-surface/90 p-4">
      <p className="text-sm font-semibold">{t(locale, "public.confirmation.cancelTitle")}</p>
      <p className="mt-1 text-sm text-muted">
        {t(locale, "public.confirmation.cancelDescription")}
      </p>

      <form action={formAction} className="mt-4 flex flex-wrap gap-3">
        <input type="hidden" name="appointmentId" value={appointmentId} />
        <input type="hidden" name="businessSlug" value={businessSlug} />
        <input type="hidden" name="locale" value={locale} />
        <button
          type="button"
          onClick={() => setIsConfirming(false)}
          className="rounded-full border border-border px-5 py-3 font-semibold transition hover:bg-surface"
        >
          {t(locale, "public.confirmation.keepAppointment")}
        </button>
        <ConfirmCancelButton locale={locale} />
      </form>

      {state.status === "error" && state.message ? (
        <p className="mt-3 rounded-2xl bg-highlight-surface px-4 py-3 text-sm text-highlight-foreground">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
