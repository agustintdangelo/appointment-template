"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { upsertStaffScheduleAction } from "@/app/admin/actions";
import CreateEntityModal from "@/app/admin/components/create-entity-modal";
import { initialAdminEntityActionState } from "@/app/admin/components/admin-collection-types";
import { getLocalizedDayLabel, getLocalizedDayOptions } from "@/lib/admin";
import {
  MAX_BUSINESS_PERIODS_PER_DAY,
  sortBusinessPeriods,
  timeStringToMinutes,
  validateBusinessPeriods,
} from "@/lib/business-hours";
import { t, weekdayValues, type AppLocale } from "@/lib/i18n";

type SchedulePeriod = {
  id: string;
  openTime: string;
  closeTime: string;
};

type AvailabilityRow = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOff: boolean;
};

type DaySchedule = {
  dayOfWeek: number;
  isOff: boolean;
  periods: SchedulePeriod[];
};

export type StaffScheduleTarget = {
  id: string;
  name: string;
  availabilities: AvailabilityRow[];
};

type Props = {
  businessSlug: string;
  staffMember: StaffScheduleTarget | null;
  onClose: () => void;
  locale: AppLocale;
};

function normalizeAvailability(rows: AvailabilityRow[]): DaySchedule[] {
  return weekdayValues.map((dayOfWeek) => {
    const dayRows = rows.filter(
      (entry) => entry.dayOfWeek === dayOfWeek && !entry.isOff,
    );
    return {
      dayOfWeek,
      isOff: dayRows.length === 0,
      periods: sortBusinessPeriods(
        dayRows.map((entry) => ({
          id: entry.id,
          openTime: entry.startTime,
          closeTime: entry.endTime,
        })),
      ),
    };
  });
}

function formatMinutesAsTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function createDefaultPeriod(existing: SchedulePeriod[]): SchedulePeriod {
  const sorted = sortBusinessPeriods(existing);
  const last = sorted.at(-1);

  if (!last) {
    return { id: crypto.randomUUID(), openTime: "09:00", closeTime: "17:00" };
  }

  const nextOpenMinutes = Math.min(timeStringToMinutes(last.closeTime) + 60, 22 * 60);
  const nextCloseMinutes = Math.min(nextOpenMinutes + 60, 23 * 60);

  if (nextCloseMinutes <= nextOpenMinutes) {
    return { id: crypto.randomUUID(), openTime: "09:00", closeTime: "17:00" };
  }

  return {
    id: crypto.randomUUID(),
    openTime: formatMinutesAsTime(nextOpenMinutes),
    closeTime: formatMinutesAsTime(nextCloseMinutes),
  };
}

function formatPeriodLabel(period: SchedulePeriod) {
  return `${period.openTime}–${period.closeTime}`;
}

function DaySummary({
  day,
  locale,
}: {
  day: DaySchedule;
  locale: AppLocale;
}) {
  if (day.isOff || day.periods.length === 0) {
    return (
      <span className="rounded-full border border-border bg-surface px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
        {t(locale, "admin.staff.offAllDayLabel")}
      </span>
    );
  }

  return (
    <span className="text-sm text-muted">
      {day.periods.map(formatPeriodLabel).join(", ")}
    </span>
  );
}

function FormErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-sm text-rose-700">{error}</p>;
}

function SaveScheduleButton({
  disabled,
  locale,
}: {
  disabled: boolean;
  locale: AppLocale;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? t(locale, "common.saving") : t(locale, "admin.staff.saveSchedule")}
    </button>
  );
}

function DayEditorForm({
  staffMember,
  businessSlug,
  seed,
  onSaved,
  locale,
}: {
  staffMember: StaffScheduleTarget;
  businessSlug: string;
  seed: DaySchedule;
  onSaved: () => void;
  locale: AppLocale;
}) {
  const router = useRouter();
  const [isOff, setIsOff] = useState(seed.isOff);
  const [periods, setPeriods] = useState<SchedulePeriod[]>(() =>
    sortBusinessPeriods(seed.periods),
  );
  const [copyToDayOfWeek, setCopyToDayOfWeek] = useState<number[]>([]);
  const [editVersion, setEditVersion] = useState(0);
  const [submittedVersion, setSubmittedVersion] = useState(0);
  const [saveState, saveAction] = useActionState(
    upsertStaffScheduleAction,
    initialAdminEntityActionState,
  );

  const validation = useMemo(
    () =>
      validateBusinessPeriods({
        periods,
        isClosed: isOff,
        locale,
      }),
    [periods, isOff, locale],
  );

  const showServerErrors = submittedVersion === editVersion;
  const periodSectionError =
    validation.formError ?? (showServerErrors ? saveState.fieldErrors.periods : undefined);
  const copyError =
    showServerErrors && !validation.hasErrors
      ? saveState.fieldErrors.copyToDayOfWeek
      : undefined;
  const copySelectionBlocked =
    isOff || validation.hasErrors || validation.sortedPeriods.length === 0;
  const saveDisabled = validation.hasErrors || !!copyError;
  const isAtMaxPeriods = periods.length >= MAX_BUSINESS_PERIODS_PER_DAY;

  useEffect(() => {
    if (saveState.status === "success") {
      onSaved();
      router.refresh();
    }
  }, [onSaved, router, saveState.status]);

  function markDirty() {
    setEditVersion((current) => current + 1);
  }

  function addPeriod() {
    if (isAtMaxPeriods) return;
    setIsOff(false);
    setPeriods((current) => sortBusinessPeriods([...current, createDefaultPeriod(current)]));
    markDirty();
  }

  function updatePeriod(
    id: string,
    field: "openTime" | "closeTime",
    value: string,
  ) {
    setPeriods((current) =>
      sortBusinessPeriods(
        current.map((period) =>
          period.id === id ? { ...period, [field]: value } : period,
        ),
      ),
    );
    markDirty();
  }

  function removePeriod(id: string) {
    setPeriods((current) => current.filter((period) => period.id !== id));
    markDirty();
  }

  function handleOffChange(checked: boolean) {
    setIsOff(checked);
    setCopyToDayOfWeek([]);
    if (!checked && periods.length === 0) {
      setPeriods([createDefaultPeriod([])]);
    }
    markDirty();
  }

  function toggleCopyDay(dayOfWeek: number) {
    setCopyToDayOfWeek((current) =>
      current.includes(dayOfWeek)
        ? current.filter((value) => value !== dayOfWeek)
        : [...current, dayOfWeek].sort((left, right) => left - right),
    );
    markDirty();
  }

  return (
    <form
      action={saveAction}
      className="grid gap-5"
      onSubmit={() => setSubmittedVersion(editVersion)}
    >
      <input type="hidden" name="businessSlug" value={businessSlug} />
      <input type="hidden" name="staffMemberId" value={staffMember.id} />
      <input type="hidden" name="dayOfWeek" value={seed.dayOfWeek} />
      <input type="hidden" name="locale" value={locale} />

      {showServerErrors && saveState.status === "error" && saveState.message ? (
        <div className="admin-error-banner">{saveState.message}</div>
      ) : null}

      <div className="admin-muted-panel px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          {t(locale, "admin.calendar.dayLabel")}
        </p>
        <p className="mt-2 text-2xl font-semibold text-slate-900">
          {getLocalizedDayLabel(seed.dayOfWeek, locale)}
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          name="isOff"
          checked={isOff}
          onChange={(event) => handleOffChange(event.target.checked)}
          className="admin-checkbox"
        />
        {t(locale, "admin.staff.scheduleOffAllDay")}
      </label>

      <div className="grid gap-4">
        <div className="admin-muted-panel px-4 py-4">
          <p className="text-sm text-muted">
            {isOff
              ? t(locale, "admin.staff.scheduleClosedDayDescription")
              : t(locale, "admin.staff.scheduleOpenDayDescription", {
                  count: MAX_BUSINESS_PERIODS_PER_DAY,
                })}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-900">
              {t(locale, "admin.staff.schedulePeriods")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {t(locale, "admin.staff.schedulePeriodsDescription")}
            </p>
          </div>
          <button
            type="button"
            onClick={addPeriod}
            disabled={isOff || isAtMaxPeriods}
            className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t(locale, "admin.staff.addSchedulePeriod")}
          </button>
        </div>

        {periods.length === 0 ? (
          <div className="admin-card-dashed px-5 py-5 text-sm text-muted">
            {isOff
              ? t(locale, "admin.staff.noSchedulePeriodsOff")
              : t(locale, "admin.staff.noSchedulePeriodsOn")}
          </div>
        ) : (
          <div className="grid gap-3">
            {periods.map((period, index) => {
              const rowError = validation.rowErrors[index];
              const openTimeError =
                rowError?.openTime ??
                (showServerErrors
                  ? saveState.fieldErrors[`periods.${index}.openTime`]
                  : undefined);
              const closeTimeError =
                rowError?.closeTime ??
                (showServerErrors
                  ? saveState.fieldErrors[`periods.${index}.closeTime`]
                  : undefined);
              const rowMessages =
                rowError && rowError.messages.length > 0
                  ? rowError.messages
                  : showServerErrors && saveState.fieldErrors[`periods.${index}.row`]
                    ? [saveState.fieldErrors[`periods.${index}.row`]]
                    : [];

              return (
                <div
                  key={period.id}
                  className="admin-muted-panel grid gap-4 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {t(locale, "admin.staff.schedulePeriod", { number: index + 1 })}
                    </p>
                    <button
                      type="button"
                      onClick={() => removePeriod(period.id)}
                      disabled={isOff}
                      className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t(locale, "admin.calendar.remove")}
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium">
                      {t(locale, "admin.calendar.opens")}
                      {isOff ? (
                        <>
                          <input type="hidden" name="openTime" value={period.openTime} />
                          <input
                            type="time"
                            value={period.openTime}
                            disabled
                            className="admin-input cursor-not-allowed opacity-60"
                          />
                        </>
                      ) : (
                        <input
                          name="openTime"
                          type="time"
                          value={period.openTime}
                          onChange={(event) =>
                            updatePeriod(period.id, "openTime", event.target.value)
                          }
                          aria-invalid={!!openTimeError}
                          className={`admin-input ${openTimeError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                        />
                      )}
                    </label>

                    <label className="grid gap-2 text-sm font-medium">
                      {t(locale, "admin.calendar.closes")}
                      {isOff ? (
                        <>
                          <input type="hidden" name="closeTime" value={period.closeTime} />
                          <input
                            type="time"
                            value={period.closeTime}
                            disabled
                            className="admin-input cursor-not-allowed opacity-60"
                          />
                        </>
                      ) : (
                        <input
                          name="closeTime"
                          type="time"
                          value={period.closeTime}
                          onChange={(event) =>
                            updatePeriod(period.id, "closeTime", event.target.value)
                          }
                          aria-invalid={!!closeTimeError}
                          className={`admin-input ${closeTimeError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : ""}`}
                        />
                      )}
                    </label>
                  </div>

                  {rowMessages.length > 0 ? (
                    <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {rowMessages.join(" ")}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <FormErrorText error={periodSectionError} />
        <p className="text-sm text-muted">
          {isAtMaxPeriods
            ? t(locale, "admin.calendar.reachedPeriodLimit", {
                count: MAX_BUSINESS_PERIODS_PER_DAY,
              })
            : t(locale, "admin.staff.openedPeriodsUsed", {
                used: periods.length,
                max: MAX_BUSINESS_PERIODS_PER_DAY,
              })}
        </p>
      </div>

      <div className="grid gap-4">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {t(locale, "admin.staff.scheduleCopyDays")}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "admin.staff.scheduleCopyDescription")}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {getLocalizedDayOptions(locale)
            .filter((day) => day.value !== seed.dayOfWeek)
            .map((day) => (
              <label
                key={day.value}
                className={`admin-muted-panel flex items-center gap-3 px-4 py-3 ${
                  copySelectionBlocked ? "opacity-60" : ""
                }`}
              >
                <input
                  type="checkbox"
                  name="copyToDayOfWeek"
                  value={day.value}
                  checked={copyToDayOfWeek.includes(day.value)}
                  onChange={() => toggleCopyDay(day.value)}
                  disabled={copySelectionBlocked}
                  className="admin-checkbox"
                />
                <span className="text-sm font-medium text-slate-900">{day.label}</span>
              </label>
            ))}
        </div>

        <p className="text-sm text-muted">
          {isOff
            ? t(locale, "admin.staff.scheduleCopyOffHint")
            : validation.sortedPeriods.length === 0
              ? t(locale, "admin.staff.scheduleCopyNeedPeriodHint")
              : t(locale, "admin.staff.scheduleCopyReadyHint")}
        </p>
        <FormErrorText error={copyError} />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <SaveScheduleButton disabled={saveDisabled} locale={locale} />
        <button
          type="button"
          onClick={onSaved}
          className="admin-button-secondary"
        >
          {t(locale, "common.cancel")}
        </button>
      </div>
    </form>
  );
}

export default function StaffScheduleModal({
  businessSlug,
  staffMember,
  onClose,
  locale,
}: Props) {
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [lastStaffMemberId, setLastStaffMemberId] = useState(staffMember?.id ?? null);

  const schedule = useMemo(
    () => (staffMember ? normalizeAvailability(staffMember.availabilities) : []),
    [staffMember],
  );

  if ((staffMember?.id ?? null) !== lastStaffMemberId) {
    setLastStaffMemberId(staffMember?.id ?? null);
    setEditingDay(null);
  }

  if (!staffMember) return null;

  const editingDaySchedule =
    editingDay !== null
      ? schedule.find((entry) => entry.dayOfWeek === editingDay) ?? null
      : null;

  return (
    <CreateEntityModal
      eyebrow={t(locale, "admin.staff.scheduleEyebrow")}
      title={
        editingDaySchedule
          ? t(locale, "admin.staff.editDay", {
              day: getLocalizedDayLabel(editingDaySchedule.dayOfWeek, locale),
            })
          : t(locale, "admin.staff.scheduleTitle", { name: staffMember.name })
      }
      description={
        editingDaySchedule
          ? t(locale, "admin.staff.scheduleModalDescription", { name: staffMember.name })
          : t(locale, "admin.staff.scheduleDescription")
      }
      isOpen
      onClose={onClose}
      closeLabel={t(locale, "common.close")}
      closeAriaLabel={t(locale, "common.closeDialog")}
    >
      {editingDaySchedule ? (
        <DayEditorForm
          businessSlug={businessSlug}
          staffMember={staffMember}
          seed={editingDaySchedule}
          onSaved={() => setEditingDay(null)}
          locale={locale}
        />
      ) : (
        <div className="grid gap-3">
          {schedule.map((day) => (
            <article
              key={day.dayOfWeek}
              className="admin-muted-panel flex flex-col gap-3 px-5 py-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-center md:gap-5"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {getLocalizedDayLabel(day.dayOfWeek, locale)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DaySummary day={day} locale={locale} />
              </div>
              <div className="flex justify-start md:justify-end">
                <button
                  type="button"
                  className="admin-button-secondary"
                  onClick={() => setEditingDay(day.dayOfWeek)}
                >
                  {t(locale, "common.edit")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </CreateEntityModal>
  );
}
