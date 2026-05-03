"use client";

import Link from "next/link";
import { useActionState, useDeferredValue, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  addDays,
  addMinutes,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

import {
  deleteBlackoutDateAction,
  upsertBlackoutDateAction,
  upsertBusinessHoursAction,
} from "@/app/admin/actions";
import CardGrid from "@/app/admin/components/card-grid";
import CollectionViewModeButton from "@/app/admin/components/collection-view-mode-button";
import CollectionViewTransition from "@/app/admin/components/collection-view-transition";
import {
  initialAdminEntityActionState,
  type AdminCollectionViewMode,
} from "@/app/admin/components/admin-collection-types";
import CreateEntityModal from "@/app/admin/components/create-entity-modal";
import ListView from "@/app/admin/components/list-view";
import useSessionCollectionViewMode from "@/app/admin/components/use-session-collection-view";
import {
  formatBlackoutRange,
  getLocalizedDayLabel,
  getLocalizedDayOptions,
  getLocalDateTimeInputValue,
} from "@/lib/admin";
import {
  MAX_BUSINESS_PERIODS_PER_DAY,
  getBusinessHoursDay,
  intersectDateWindows,
  sortBusinessPeriods,
  timeStringToMinutes,
  validateBusinessPeriods,
  type BusinessHoursDayRecord,
  type BusinessPeriodRecord,
} from "@/lib/business-hours";
import { formatAppointmentDateTime } from "@/lib/format";
import {
  getDateFnsLocale,
  t,
  type AppLocale,
} from "@/lib/i18n";
import { buildAdminBusinessPath } from "@/lib/tenant";

type BusinessPeriod = BusinessPeriodRecord;
type BusinessHoursDay = BusinessHoursDayRecord<BusinessPeriod>;

type StaffAvailabilityRecord = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isOff: boolean;
};

type StaffRecord = {
  id: string;
  name: string;
  title: string | null;
  isActive: boolean;
  sortOrder: number;
  availabilities: StaffAvailabilityRecord[];
};

type AppointmentRecord = {
  id: string;
  confirmationCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  notes: string | null;
  status: string;
  startAt: Date;
  endAt: Date;
  service: {
    name: string;
    durationMinutes: number;
    bufferMinutes: number;
  };
  staffMember: {
    id: string;
    name: string;
  } | null;
};

type BlackoutRecord = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
  staffMemberId: string | null;
  staffMember: {
    name: string;
  } | null;
};

type CalendarManagerProps = {
  businessSlug: string;
  businessHours: BusinessHoursDay[];
  staffMembers: StaffRecord[];
  appointments: AppointmentRecord[];
  blackoutDates: BlackoutRecord[];
  locale: AppLocale;
};

type CalendarViewMode = "day" | "week" | "month";
type BlackoutScopeFilter = "all" | "business" | "staff";
type BlackoutTimeFilter = "all" | "upcoming" | "active" | "past";

type CalendarItem =
  | {
      key: string;
      kind: "appointment";
      startsAt: Date;
      endsAt: Date;
      title: string;
      subtitle: string;
      appointment: AppointmentRecord;
      staffMemberId: string | null;
    }
  | {
      key: string;
      kind: "blackout";
      startsAt: Date;
      endsAt: Date;
      title: string;
      subtitle: string;
      blackout: BlackoutRecord;
      staffMemberId: string | null;
    };

type PositionedCalendarItem = CalendarItem & {
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
};

type WorkingWindow = {
  startAt: Date;
  endAt: Date;
};

type BlackoutModalSeed = {
  mode: "create" | "edit";
  blackoutDateId?: string;
  staffMemberId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
};

type BusinessHoursModalSeed = {
  dayOfWeek: number;
  periods: Array<{
    id: string;
    openTime: string;
    closeTime: string;
  }>;
  isClosed: boolean;
};

const CALENDAR_WEEK_STARTS_ON = 0;
const DEFAULT_GRID_START_HOUR = 7;
const DEFAULT_GRID_END_HOUR = 20;
const GRID_HOUR_HEIGHT = 56;
const MIN_EVENT_HEIGHT = 28;
const BLACKOUT_VIEW_STORAGE_KEY = "appointment-admin-calendar-blackouts-view-mode";

function getCalendarViewOptions(locale: AppLocale) {
  return [
    { value: "day" as const, label: t(locale, "admin.calendar.day") },
    { value: "week" as const, label: t(locale, "admin.calendar.week") },
    { value: "month" as const, label: t(locale, "admin.calendar.month") },
  ];
}

function getBlackoutScopeOptions(locale: AppLocale) {
  return [
    { value: "all" as const, label: t(locale, "admin.calendar.allScopes") },
    { value: "business" as const, label: t(locale, "admin.calendar.businessWide") },
    { value: "staff" as const, label: t(locale, "admin.calendar.staffSpecific") },
  ];
}

function getBlackoutTimeOptions(locale: AppLocale) {
  return [
    { value: "all" as const, label: t(locale, "admin.calendar.allTimings") },
    { value: "upcoming" as const, label: t(locale, "admin.calendar.upcoming") },
    { value: "active" as const, label: t(locale, "admin.calendar.activeNow") },
    { value: "past" as const, label: t(locale, "admin.calendar.past") },
  ];
}

function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(date);

  next.setHours(hours, minutes, 0, 0);

  return next;
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

function getCalendarRangeStart(focusDate: Date, viewMode: CalendarViewMode) {
  if (viewMode === "day") {
    return startOfDay(focusDate);
  }

  if (viewMode === "week") {
    return startOfWeek(focusDate, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
  }

  return startOfWeek(startOfMonth(focusDate), { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
}

function getCalendarRangeEnd(focusDate: Date, viewMode: CalendarViewMode) {
  if (viewMode === "day") {
    return endOfDay(focusDate);
  }

  if (viewMode === "week") {
    return endOfDay(endOfWeek(focusDate, { weekStartsOn: CALENDAR_WEEK_STARTS_ON }));
  }

  return endOfDay(
    endOfWeek(endOfMonth(focusDate), { weekStartsOn: CALENDAR_WEEK_STARTS_ON }),
  );
}

function getVisibleDays(focusDate: Date, viewMode: CalendarViewMode) {
  return eachDayOfInterval({
    start: getCalendarRangeStart(focusDate, viewMode),
    end: getCalendarRangeEnd(focusDate, viewMode),
  });
}

function getRangeLabel(focusDate: Date, viewMode: CalendarViewMode, locale: AppLocale) {
  const dateLocale = getDateFnsLocale(locale);

  if (viewMode === "day") {
    return format(focusDate, t(locale, "format.rangeDay"), { locale: dateLocale });
  }

  if (viewMode === "week") {
    const weekStart = startOfWeek(focusDate, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
    const weekEnd = endOfWeek(focusDate, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });

    if (
      format(weekStart, "MMM yyyy", { locale: dateLocale }) ===
      format(weekEnd, "MMM yyyy", { locale: dateLocale })
    ) {
      return `${format(weekStart, "MMM d", { locale: dateLocale })} - ${format(
        weekEnd,
        "d, yyyy",
        { locale: dateLocale },
      )}`;
    }

    return `${format(weekStart, "MMM d", { locale: dateLocale })} - ${format(
      weekEnd,
      "MMM d, yyyy",
      { locale: dateLocale },
    )}`;
  }

  return format(focusDate, t(locale, "format.rangeMonth"), { locale: dateLocale });
}

function shiftFocusDate(date: Date, viewMode: CalendarViewMode, direction: "prev" | "next") {
  if (viewMode === "day") {
    return direction === "prev" ? subDays(date, 1) : addDays(date, 1);
  }

  if (viewMode === "week") {
    return direction === "prev" ? subWeeks(date, 1) : addWeeks(date, 1);
  }

  return direction === "prev" ? subMonths(date, 1) : addMonths(date, 1);
}

function addWeeks(date: Date, amount: number) {
  return addDays(date, amount * 7);
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function getInitialFocusDate(appointments: AppointmentRecord[], blackoutDates: BlackoutRecord[]) {
  const now = new Date();
  const nextItem = [
    ...appointments.map((appointment) => ({
      startAt: appointment.startAt,
      endAt: appointment.endAt,
    })),
    ...blackoutDates.map((blackout) => ({
      startAt: blackout.startsAt,
      endAt: blackout.endsAt,
    })),
  ]
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
    .find((item) => item.endAt.getTime() >= now.getTime());

  return nextItem ? startOfDay(nextItem.startAt) : startOfDay(now);
}

function getAppointmentClasses(status: string, isSelected: boolean) {
  if (status === "CONFIRMED") {
    return isSelected
      ? "border-slate-900 bg-slate-900 text-slate-50"
      : "border-slate-300 bg-slate-100 text-slate-800";
  }

  if (status === "PENDING") {
    return isSelected
      ? "border-amber-300 bg-amber-100 text-amber-950"
      : "border-amber-200 bg-amber-50 text-amber-900";
  }

  return isSelected
    ? "border-slate-300 bg-slate-100 text-slate-900"
    : "border-slate-200 bg-white text-slate-600";
}

function getBlackoutClasses(isSelected: boolean) {
  return isSelected
    ? "border-amber-300 bg-amber-100 text-amber-950"
    : "border-amber-200 bg-amber-50 text-amber-900";
}

function matchesCalendarStaffFilter(item: CalendarItem, selectedStaffId: string) {
  if (selectedStaffId === "all") {
    return true;
  }

  if (item.kind === "appointment") {
    return item.staffMemberId === selectedStaffId;
  }

  return item.staffMemberId === null || item.staffMemberId === selectedStaffId;
}

function buildCalendarItems(
  appointments: AppointmentRecord[],
  blackoutDates: BlackoutRecord[],
  selectedStaffId: string,
  locale: AppLocale,
) {
  const appointmentItems: CalendarItem[] = appointments
    .map((appointment) => ({
      key: `appointment-${appointment.id}`,
      kind: "appointment" as const,
      startsAt: appointment.startAt,
      endsAt: appointment.endAt,
      title: appointment.service.name,
      subtitle: appointment.customerName,
      appointment,
      staffMemberId: appointment.staffMember?.id ?? null,
    }))
    .filter((item) => matchesCalendarStaffFilter(item, selectedStaffId));

  const blackoutItems: CalendarItem[] = blackoutDates
    .map((blackout) => ({
      key: `blackout-${blackout.id}`,
      kind: "blackout" as const,
      startsAt: blackout.startsAt,
      endsAt: blackout.endsAt,
      title: blackout.reason ?? t(locale, "common.blockedTime"),
      subtitle: blackout.staffMember?.name ?? t(locale, "common.entireBusiness"),
      blackout,
      staffMemberId: blackout.staffMemberId,
    }))
    .filter((item) => matchesCalendarStaffFilter(item, selectedStaffId));

  return [...appointmentItems, ...blackoutItems].sort(
    (left, right) => left.startsAt.getTime() - right.startsAt.getTime(),
  );
}

function getWorkingWindowsForDay(
  date: Date,
  selectedStaffMember: StaffRecord | null,
  businessHours: BusinessHoursDay[],
) {
  const businessHoursForDay = getBusinessHoursDay(businessHours, getDay(date));
  const businessWindows = businessHoursForDay.periods.map((entry) => ({
    startAt: combineDateAndTime(date, entry.openTime),
    endAt: combineDateAndTime(date, entry.closeTime),
  }));

  if (businessHoursForDay.isClosed || businessWindows.length === 0) {
    return [] as WorkingWindow[];
  }

  if (!selectedStaffMember) {
    return businessWindows;
  }

  const staffWindows = selectedStaffMember.availabilities
    .filter((availability) => availability.dayOfWeek === getDay(date) && !availability.isOff)
    .map((availability) => ({
      startAt: combineDateAndTime(date, availability.startTime),
      endAt: combineDateAndTime(date, availability.endTime),
    }));

  return intersectDateWindows(staffWindows, businessWindows);
}

function getWindowSummary(windows: WorkingWindow[], locale: AppLocale) {
  if (windows.length === 0) {
    return t(locale, "common.closed");
  }

  return windows
    .map(
      (window) =>
        `${format(window.startAt, "h:mm a", {
          locale: getDateFnsLocale(locale),
        })} - ${format(window.endAt, "h:mm a", { locale: getDateFnsLocale(locale) })}`,
    )
    .join(", ");
}

function getReferenceDateForDay(dayOfWeek: number) {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
  return addDays(weekStart, dayOfWeek);
}

function getGridBounds(days: Date[], items: CalendarItem[], workingWindowsByDay: WorkingWindow[][]) {
  const hourCandidates: number[] = [DEFAULT_GRID_START_HOUR, DEFAULT_GRID_END_HOUR];

  for (const [dayIndex, day] of days.entries()) {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);

    for (const window of workingWindowsByDay[dayIndex] ?? []) {
      hourCandidates.push(window.startAt.getHours());
      hourCandidates.push(window.endAt.getHours() + (window.endAt.getMinutes() > 0 ? 1 : 0));
    }

    for (const item of items) {
      if (!overlaps(item.startsAt, item.endsAt, dayStart, addDays(dayStart, 1))) {
        continue;
      }

      const clippedStart =
        item.startsAt.getTime() > dayStart.getTime() ? item.startsAt : dayStart;
      const clippedEnd =
        item.endsAt.getTime() < dayEnd.getTime() ? item.endsAt : addDays(dayStart, 1);

      hourCandidates.push(Math.max(0, clippedStart.getHours() - 1));
      hourCandidates.push(
        Math.min(24, clippedEnd.getHours() + (clippedEnd.getMinutes() > 0 ? 1 : 0) + 1),
      );
    }
  }

  return {
    startHour: Math.max(0, Math.min(...hourCandidates)),
    endHour: Math.min(24, Math.max(...hourCandidates)),
  };
}

function getPositionedItemsForDay(
  day: Date,
  items: CalendarItem[],
  startHour: number,
  endHour: number,
) {
  const dayStart = startOfDay(day);
  const displayStart = combineDateAndTime(day, `${String(startHour).padStart(2, "0")}:00`);
  const displayEnd = combineDateAndTime(day, `${String(endHour).padStart(2, "0")}:00`);

  const clippedItems = items
    .filter((item) => overlaps(item.startsAt, item.endsAt, dayStart, addDays(dayStart, 1)))
    .map((item) => {
      const clippedStart =
        item.startsAt.getTime() > displayStart.getTime() ? item.startsAt : displayStart;
      const clippedEnd = item.endsAt.getTime() < displayEnd.getTime() ? item.endsAt : displayEnd;

      return {
        ...item,
        clippedStart,
        clippedEnd,
      };
    })
    .filter((item) => item.clippedStart.getTime() < item.clippedEnd.getTime())
    .sort((left, right) => {
      if (left.clippedStart.getTime() === right.clippedStart.getTime()) {
        return right.clippedEnd.getTime() - left.clippedEnd.getTime();
      }

      return left.clippedStart.getTime() - right.clippedStart.getTime();
    });

  const positionedItems: PositionedCalendarItem[] = [];
  let clusterItems: typeof clippedItems = [];
  let clusterEndTime = 0;

  function flushCluster() {
    if (clusterItems.length === 0) {
      return;
    }

    const columnEndTimes: number[] = [];
    const clusterLayout = clusterItems.map((item) => {
      let columnIndex = columnEndTimes.findIndex(
        (endTime) => item.clippedStart.getTime() >= endTime,
      );

      if (columnIndex === -1) {
        columnIndex = columnEndTimes.length;
        columnEndTimes.push(item.clippedEnd.getTime());
      } else {
        columnEndTimes[columnIndex] = item.clippedEnd.getTime();
      }

      return {
        item,
        columnIndex,
      };
    });

    const totalColumns = columnEndTimes.length;

    for (const { item, columnIndex } of clusterLayout) {
      const startMinutes =
        (item.clippedStart.getHours() - startHour) * 60 + item.clippedStart.getMinutes();
      const endMinutes =
        (item.clippedEnd.getHours() - startHour) * 60 + item.clippedEnd.getMinutes();
      const durationMinutes = Math.max(30, endMinutes - startMinutes);

      positionedItems.push({
        ...item,
        top: (startMinutes / 60) * GRID_HOUR_HEIGHT,
        height: Math.max(MIN_EVENT_HEIGHT, (durationMinutes / 60) * GRID_HOUR_HEIGHT),
        leftPercent: (columnIndex / totalColumns) * 100,
        widthPercent: 100 / totalColumns,
      });
    }

    clusterItems = [];
    clusterEndTime = 0;
  }

  for (const item of clippedItems) {
    if (clusterItems.length === 0) {
      clusterItems.push(item);
      clusterEndTime = item.clippedEnd.getTime();
      continue;
    }

    if (item.clippedStart.getTime() >= clusterEndTime) {
      flushCluster();
    }

    clusterItems.push(item);

    if (item.clippedEnd.getTime() > clusterEndTime) {
      clusterEndTime = item.clippedEnd.getTime();
    }
  }

  flushCluster();

  return positionedItems;
}

function getBlackoutTimingStatus(blackout: BlackoutRecord, now: Date, locale: AppLocale) {
  if (blackout.startsAt.getTime() <= now.getTime() && blackout.endsAt.getTime() > now.getTime()) {
    return t(locale, "admin.calendar.activeNow");
  }

  if (blackout.startsAt.getTime() > now.getTime()) {
    return t(locale, "admin.calendar.upcoming");
  }

  return t(locale, "admin.calendar.past");
}

function matchesBlackoutSearch(blackout: BlackoutRecord, query: string, locale: AppLocale) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();

  return [
    blackout.reason ?? "",
    blackout.staffMember?.name ?? t(locale, "common.entireBusiness"),
    formatBlackoutRange(blackout.startsAt, blackout.endsAt, locale),
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
}

function matchesBlackoutScope(blackout: BlackoutRecord, scopeFilter: BlackoutScopeFilter) {
  if (scopeFilter === "business") {
    return blackout.staffMemberId === null;
  }

  if (scopeFilter === "staff") {
    return blackout.staffMemberId !== null;
  }

  return true;
}

function matchesBlackoutTime(blackout: BlackoutRecord, timeFilter: BlackoutTimeFilter, now: Date) {
  if (timeFilter === "upcoming") {
    return blackout.startsAt.getTime() > now.getTime();
  }

  if (timeFilter === "active") {
    return blackout.startsAt.getTime() <= now.getTime() && blackout.endsAt.getTime() > now.getTime();
  }

  if (timeFilter === "past") {
    return blackout.endsAt.getTime() <= now.getTime();
  }

  return true;
}

function buildBlackoutSeed(
  focusDate: Date,
  selectedStaffMember: StaffRecord | null,
  businessHours: BusinessHoursDay[],
) {
  const workingWindows = getWorkingWindowsForDay(focusDate, selectedStaffMember, businessHours);
  const firstWindow = workingWindows[0];
  const defaultStart = firstWindow?.startAt ?? combineDateAndTime(focusDate, "09:00");
  let defaultEnd = addMinutes(defaultStart, 60);

  if (firstWindow && defaultEnd.getTime() > firstWindow.endAt.getTime()) {
    defaultEnd = firstWindow.endAt;
  }

  if (defaultEnd.getTime() <= defaultStart.getTime()) {
    defaultEnd = addMinutes(defaultStart, 60);
  }

  return {
    mode: "create" as const,
    staffMemberId: selectedStaffMember?.id ?? "",
    startsAt: getLocalDateTimeInputValue(defaultStart),
    endsAt: getLocalDateTimeInputValue(defaultEnd),
    reason: "",
  };
}

function createEditBlackoutSeed(blackout: BlackoutRecord) {
  return {
    mode: "edit" as const,
    blackoutDateId: blackout.id,
    staffMemberId: blackout.staffMemberId ?? "",
    startsAt: getLocalDateTimeInputValue(blackout.startsAt),
    endsAt: getLocalDateTimeInputValue(blackout.endsAt),
    reason: blackout.reason ?? "",
  };
}

function createBusinessHoursSeed(entry: BusinessHoursDay): BusinessHoursModalSeed {
  return {
    dayOfWeek: entry.dayOfWeek,
    isClosed: entry.isClosed,
    periods:
      entry.periods.length > 0
        ? entry.periods.map((period) => ({
            id: period.id,
            openTime: period.openTime,
            closeTime: period.closeTime,
          }))
        : [],
  };
}

function formatBusinessPeriodLabel(
  dayOfWeek: number,
  openTime: string,
  closeTime: string,
  locale: AppLocale,
) {
  const referenceDate = getReferenceDateForDay(dayOfWeek);
  const dateLocale = getDateFnsLocale(locale);

  return `${format(combineDateAndTime(referenceDate, openTime), "h:mm a", {
    locale: dateLocale,
  })} - ${format(combineDateAndTime(referenceDate, closeTime), "h:mm a", {
    locale: dateLocale,
  })}`;
}

function formatBusinessHoursLabel(entry: BusinessHoursDay, locale: AppLocale) {
  if (entry.isClosed && entry.periods.length === 0) {
    return t(locale, "admin.calendar.closedAllDayLabel");
  }

  const periodLabel = entry.periods
    .map((period) =>
      formatBusinessPeriodLabel(entry.dayOfWeek, period.openTime, period.closeTime, locale),
    )
    .join(", ");

  if (entry.isClosed) {
    return t(locale, "admin.calendar.closedSavedPeriods", {
      periods: periodLabel,
    });
  }

  return periodLabel;
}

function formatMinutesAsTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function createDefaultBusinessPeriod(
  existingPeriods: Array<{ openTime: string; closeTime: string }>,
) {
  const sortedPeriods = sortBusinessPeriods(existingPeriods);
  const lastPeriod = sortedPeriods.at(-1);

  if (!lastPeriod) {
    return {
      id: crypto.randomUUID(),
      openTime: "09:00",
      closeTime: "17:00",
    };
  }

  const nextOpenMinutes = Math.min(timeStringToMinutes(lastPeriod.closeTime) + 60, 22 * 60);
  const nextCloseMinutes = Math.min(nextOpenMinutes + 60, 23 * 60);

  if (nextCloseMinutes <= nextOpenMinutes) {
    return {
      id: crypto.randomUUID(),
      openTime: "09:00",
      closeTime: "17:00",
    };
  }

  return {
    id: crypto.randomUUID(),
    openTime: formatMinutesAsTime(nextOpenMinutes),
    closeTime: formatMinutesAsTime(nextCloseMinutes),
  };
}

function AnimatedFeedbackSlot({
  isVisible,
  children,
  variant = "inline",
}: {
  isVisible: boolean;
  children: ReactNode;
  variant?: "inline" | "banner" | "panel";
}) {
  return (
    <div
      data-visible={isVisible}
      className={`admin-feedback-slot admin-feedback-slot-${variant}`}
      aria-live="polite"
    >
      <div className="admin-feedback-slot-inner">{children}</div>
    </div>
  );
}

function FormErrorText({ error }: { error?: string }) {
  return (
    <AnimatedFeedbackSlot isVisible={!!error}>
      <p className="admin-inline-error-text">{error ?? ""}</p>
    </AnimatedFeedbackSlot>
  );
}

function ErrorBanner({ message }: { message?: string }) {
  return (
    <AnimatedFeedbackSlot isVisible={!!message} variant="banner">
      <div className="admin-error-banner">{message ?? ""}</div>
    </AnimatedFeedbackSlot>
  );
}

function CalendarToolbar({
  viewMode,
  onViewModeChange,
  rangeLabel,
  onPrevious,
  onToday,
  onNext,
  selectedStaffId,
  onSelectedStaffIdChange,
  staffMembers,
  locale,
}: {
  viewMode: CalendarViewMode;
  onViewModeChange: (value: CalendarViewMode) => void;
  rangeLabel: string;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
  selectedStaffId: string;
  onSelectedStaffIdChange: (value: string) => void;
  staffMembers: StaffRecord[];
  locale: AppLocale;
}) {
  return (
    <section
      data-locale-section=""
      data-locale-section-order="2"
      className="admin-panel px-4 py-4 sm:px-5"
    >
      <div className="grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPrevious}
            className="admin-button-secondary"
          >
            {t(locale, "common.previous")}
          </button>
          <button
            type="button"
            onClick={onToday}
            className="admin-button-secondary"
          >
            {t(locale, "common.today")}
          </button>
          <button
            type="button"
            onClick={onNext}
            className="admin-button-secondary"
          >
            {t(locale, "common.next")}
          </button>
        </div>

        <div className="min-w-0">
          <p className="truncate text-center text-2xl font-semibold text-slate-900 sm:text-3xl">
            {rangeLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
          <label className="sr-only" htmlFor="calendar-staff-scope">
            {t(locale, "admin.calendar.staffScope")}
          </label>
          <div className="relative">
            <select
              id="calendar-staff-scope"
              value={selectedStaffId}
              onChange={(event) => onSelectedStaffIdChange(event.target.value)}
              className="admin-select h-11 min-w-[11rem] appearance-none rounded-full px-4 pr-10 text-sm font-semibold"
            >
              <option value="all">{t(locale, "common.allStaff")}</option>
              {staffMembers.map((staffMember) => (
                <option key={staffMember.id} value={staffMember.id}>
                  {staffMember.name}
                  {staffMember.isActive ? "" : t(locale, "common.inactiveSuffix")}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4.5 w-4.5"
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

          <div className="flex rounded-full border border-slate-300 bg-white p-1">
            {getCalendarViewOptions(locale).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onViewModeChange(option.value)}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                  viewMode === option.value
                    ? "bg-slate-900 text-white"
                    : "text-muted hover:text-slate-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CalendarLegendCard({ locale }: { locale: AppLocale }) {
  return (
    <section data-locale-section="" data-locale-section-order="4" className="admin-card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
        {t(locale, "admin.calendar.legend")}
      </p>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="h-3.5 w-3.5 rounded-full bg-slate-900" />
          <span>{t(locale, "common.appointments")}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3.5 w-3.5 rounded-full bg-amber-200" />
          <span>{t(locale, "admin.calendar.blackoutDates")}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3.5 w-3.5 rounded-full bg-slate-200 ring-1 ring-slate-300" />
          <span>{t(locale, "admin.calendar.workingHoursOverlay")}</span>
        </div>
      </div>
    </section>
  );
}

function PeriodSnapshotCard({
  businessSlug,
  rangeLabel,
  selectedStaffMember,
  visibleAppointmentsCount,
  visibleBlackoutsCount,
  selectedItem,
  onEditBlackout,
  locale,
}: {
  businessSlug: string;
  rangeLabel: string;
  selectedStaffMember: StaffRecord | null;
  visibleAppointmentsCount: number;
  visibleBlackoutsCount: number;
  selectedItem: CalendarItem | null;
  onEditBlackout: (blackout: BlackoutRecord) => void;
  locale: AppLocale;
}) {
  return (
    <section data-locale-section="" data-locale-section-order="4" className="admin-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            {t(locale, "admin.calendar.periodSnapshot")}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">{rangeLabel}</h3>
        </div>
        <span className="rounded-full border border-border bg-surface px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted">
          {selectedStaffMember ? selectedStaffMember.name : t(locale, "common.allStaff")}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="admin-muted-panel px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {t(locale, "common.appointments")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{visibleAppointmentsCount}</p>
        </div>
        <div className="admin-muted-panel px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {t(locale, "admin.calendar.blackoutDates")}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{visibleBlackoutsCount}</p>
        </div>
      </div>

      <div className="admin-muted-panel mt-5 px-4 py-4">
        {selectedItem ? (
          selectedItem.kind === "blackout" ? (
            <div className="grid gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  {t(locale, "admin.calendar.selectedBlackout")}
                </p>
                <p className="mt-2 text-base font-semibold">
                  {selectedItem.blackout.reason ?? t(locale, "common.blockedTime")}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {formatBlackoutRange(
                    selectedItem.blackout.startsAt,
                    selectedItem.blackout.endsAt,
                    locale,
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEditBlackout(selectedItem.blackout)}
                className="admin-button-secondary w-fit"
              >
                {t(locale, "admin.calendar.editBlackoutDate")}
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  {t(locale, "admin.calendar.selectedAppointment")}
                </p>
                <p className="mt-2 text-base font-semibold">{selectedItem.appointment.service.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {selectedItem.appointment.customerName} ·{" "}
                  {formatAppointmentDateTime(selectedItem.appointment.startAt, locale)}
                </p>
              </div>
              <Link
                href={buildAdminBusinessPath(businessSlug, "/appointments")}
                className="admin-button-secondary w-fit"
              >
                {t(locale, "admin.calendar.openAppointments")}
              </Link>
            </div>
          )
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              {t(locale, "admin.calendar.selection")}
            </p>
            <p className="mt-2 text-sm text-muted">
              {t(locale, "admin.calendar.selectionHint")}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function MonthView({
  focusDate,
  days,
  items,
  selectedItemKey,
  workingWindowsByDay,
  onSelectItem,
  locale,
}: {
  focusDate: Date;
  days: Date[];
  items: CalendarItem[];
  selectedItemKey: string | null;
  workingWindowsByDay: WorkingWindow[][];
  onSelectItem: (item: CalendarItem) => void;
  locale: AppLocale;
}) {
  const dayNames = getLocalizedDayOptions(locale).map((day) => day.label.slice(0, 3));

  return (
    <section
      data-locale-section=""
      data-locale-section-order="3"
      className="admin-list-shell rounded-[1.25rem]"
    >
      <div className="grid grid-cols-7 border-b border-border bg-surface/80">
        {dayNames.map((dayName) => (
          <div
            key={dayName}
            className="px-3 py-4 text-center text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted sm:px-4"
          >
            {dayName}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7">
        {days.map((day, index) => {
          const dayItems = items.filter((item) =>
            overlaps(item.startsAt, item.endsAt, startOfDay(day), addDays(startOfDay(day), 1)),
          );
          const dayWindows = workingWindowsByDay[index] ?? [];
          const overflowCount = Math.max(0, dayItems.length - 3);

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[11rem] border-b border-border p-3 md:min-h-[12rem] ${
                index % 7 === 6 ? "" : "md:border-r"
              } ${isSameMonth(day, focusDate) ? "bg-card" : "bg-surface/80"}`}
            >
              <div>
                <p
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-semibold ${
                    isToday(day)
                      ? "bg-slate-900 text-slate-50"
                      : isSameMonth(day, focusDate)
                        ? "bg-slate-100 text-slate-900"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {format(day, "d")}
                </p>
                <p className="mt-2 text-[0.7rem] text-muted">
                  {getWindowSummary(dayWindows, locale)}
                </p>
              </div>

              <div className="mt-4 grid gap-2">
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelectItem(item)}
                    className={`rounded-[1rem] border px-3 py-2 text-left transition ${
                      item.kind === "appointment"
                        ? getAppointmentClasses(
                            item.appointment.status,
                            selectedItemKey === item.key,
                          )
                        : getBlackoutClasses(selectedItemKey === item.key)
                    }`}
                  >
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] opacity-80">
                      {format(item.startsAt, "h:mm a", { locale: getDateFnsLocale(locale) })}
                    </p>
                    <p className="mt-1 line-clamp-1 text-sm font-semibold">{item.title}</p>
                    <p className="line-clamp-1 text-xs opacity-75">{item.subtitle}</p>
                  </button>
                ))}

                {overflowCount > 0 ? (
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
                    {t(locale, "admin.calendar.more", { count: overflowCount })}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TimeGridView({
  days,
  items,
  selectedItemKey,
  workingWindowsByDay,
  onSelectItem,
  locale,
}: {
  days: Date[];
  items: CalendarItem[];
  selectedItemKey: string | null;
  workingWindowsByDay: WorkingWindow[][];
  onSelectItem: (item: CalendarItem) => void;
  locale: AppLocale;
}) {
  const { startHour, endHour } = getGridBounds(days, items, workingWindowsByDay);
  const totalHours = Math.max(1, endHour - startHour);
  const gridHeight = totalHours * GRID_HOUR_HEIGHT;
  const hourMarks = Array.from({ length: totalHours + 1 }, (_, index) => startHour + index);
  const isMultiDay = days.length > 1;
  const gridTemplateColumns = `4rem repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <section
      data-locale-section=""
      data-locale-section-order="3"
      className="admin-list-shell rounded-[1.25rem]"
    >
      <div className="w-full min-w-0">
        <div
          className="grid border-b border-border"
          style={{
            gridTemplateColumns,
          }}
        >
          <div aria-hidden="true" className="border-r border-border bg-surface/80 px-3 py-4" />
          {days.map((day, index) => (
            <div
              key={day.toISOString()}
              className={`bg-surface/80 px-3 py-4 sm:px-4 ${index === days.length - 1 ? "" : "border-r border-border"}`}
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted">
                {format(day, "EEE", { locale: getDateFnsLocale(locale) })}
              </p>
              <div className={`mt-2 ${isMultiDay ? "grid gap-1" : "flex items-center gap-3"}`}>
                <p
                  className={`font-semibold text-slate-900 ${
                    isMultiDay ? "text-2xl sm:text-3xl" : "text-3xl"
                  } ${isToday(day) ? "text-slate-900" : "text-slate-900"}`}
                >
                  {format(day, "d")}
                </p>
                <p className="line-clamp-2 text-[0.7rem] leading-4 text-muted sm:text-xs">
                  {getWindowSummary(workingWindowsByDay[index] ?? [], locale)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns,
          }}
        >
          <div className="border-r border-border bg-surface/55">
            <div className="relative" style={{ height: gridHeight }}>
              {hourMarks.slice(0, -1).map((hour) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 flex -translate-y-1/2 items-center justify-end pr-3 text-xs text-muted"
                  style={{ top: (hour - startHour + 0.5) * GRID_HOUR_HEIGHT }}
                >
                  {format(
                    combineDateAndTime(new Date(), `${String(hour).padStart(2, "0")}:00`),
                    "h a",
                    { locale: getDateFnsLocale(locale) },
                  )}
                </div>
              ))}
            </div>
          </div>

          {days.map((day, index) => {
            const positionedItems = getPositionedItemsForDay(day, items, startHour, endHour);

            return (
              <div
                key={day.toISOString()}
                className={`border-border bg-card ${index === days.length - 1 ? "" : "border-r"}`}
              >
                <div className="relative" style={{ height: gridHeight }}>
                  {hourMarks.map((hour) => (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="absolute inset-x-0 border-t border-border/70"
                      style={{ top: (hour - startHour) * GRID_HOUR_HEIGHT }}
                    />
                  ))}

                  {(workingWindowsByDay[index] ?? []).map((window) => {
                    const windowStartMinutes =
                      (window.startAt.getHours() - startHour) * 60 + window.startAt.getMinutes();
                    const windowEndMinutes =
                      (window.endAt.getHours() - startHour) * 60 + window.endAt.getMinutes();

                    return (
                      <div
                        key={`${window.startAt.toISOString()}-${window.endAt.toISOString()}`}
                        className="absolute inset-x-1.5 rounded-[1rem] border border-slate-200 bg-slate-100 sm:inset-x-2"
                        style={{
                          top: (windowStartMinutes / 60) * GRID_HOUR_HEIGHT,
                          height:
                            Math.max(0.5, (windowEndMinutes - windowStartMinutes) / 60) *
                            GRID_HOUR_HEIGHT,
                        }}
                      />
                    );
                  })}

                  {positionedItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className={`absolute overflow-hidden rounded-[1rem] border px-2 py-2 text-left transition sm:px-3 ${
                        item.kind === "appointment"
                          ? getAppointmentClasses(
                              item.appointment.status,
                              selectedItemKey === item.key,
                            )
                          : getBlackoutClasses(selectedItemKey === item.key)
                      }`}
                      style={{
                        top: item.top,
                        height: item.height,
                        left: `calc(${item.leftPercent}% + 0.2rem)`,
                        width: `calc(${item.widthPercent}% - 0.4rem)`,
                      }}
                    >
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] opacity-80">
                        {format(item.startsAt, "h:mm a", {
                          locale: getDateFnsLocale(locale),
                        })}
                      </p>
                      <p className="mt-1 line-clamp-1 text-sm font-semibold">{item.title}</p>
                      <p className="line-clamp-2 text-xs opacity-75">{item.subtitle}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SaveBlackoutButton({
  isEditing,
  locale,
}: {
  isEditing: boolean;
  locale: AppLocale;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="admin-button-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? isEditing
          ? t(locale, "common.saving")
          : t(locale, "common.creating")
        : isEditing
          ? t(locale, "admin.calendar.saveBlackout")
          : t(locale, "admin.calendar.createBlackout")}
    </button>
  );
}

function DeleteBlackoutButton({ locale }: { locale: AppLocale }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? t(locale, "common.deleting") : t(locale, "admin.calendar.deleteBlackout")}
    </button>
  );
}

function BlackoutModalForm({
  seed,
  businessSlug,
  staffMembers,
  onClose,
  locale,
}: {
  seed: BlackoutModalSeed;
  businessSlug: string;
  staffMembers: StaffRecord[];
  onClose: () => void;
  locale: AppLocale;
}) {
  const router = useRouter();
  const [saveState, saveAction] = useActionState(
    upsertBlackoutDateAction,
    initialAdminEntityActionState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteBlackoutDateAction,
    initialAdminEntityActionState,
  );
  const isEditing = seed.mode === "edit";

  useEffect(() => {
    if (saveState.status === "success" || deleteState.status === "success") {
      onClose();
      router.refresh();
    }
  }, [deleteState.status, onClose, router, saveState.status]);

  return (
    <div className="grid gap-6">
      <form action={saveAction} className="grid gap-5">
        <input type="hidden" name="businessSlug" value={businessSlug} />
        <input type="hidden" name="blackoutDateId" defaultValue={seed.blackoutDateId ?? ""} />
        <input type="hidden" name="locale" value={locale} />

        {saveState.status === "error" && saveState.message ? (
          <div className="admin-error-banner">
            {saveState.message}
          </div>
        ) : null}

        <label className="grid gap-2 text-sm font-medium">
          {t(locale, "admin.calendar.appliesTo")}
          <select
            name="staffMemberId"
            defaultValue={seed.staffMemberId}
            className="admin-select"
          >
            <option value="">{t(locale, "common.entireBusiness")}</option>
            {staffMembers.map((staffMember) => (
              <option key={staffMember.id} value={staffMember.id}>
                {staffMember.name}
                {staffMember.isActive ? "" : t(locale, "common.inactiveSuffix")}
              </option>
            ))}
          </select>
          <FormErrorText error={saveState.fieldErrors.staffMemberId} />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "admin.calendar.starts")}
            <input
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={seed.startsAt}
              className="admin-input"
            />
            <FormErrorText error={saveState.fieldErrors.startsAt} />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            {t(locale, "admin.calendar.ends")}
            <input
              name="endsAt"
              type="datetime-local"
              required
              defaultValue={seed.endsAt}
              className="admin-input"
            />
            <FormErrorText error={saveState.fieldErrors.endsAt} />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          {t(locale, "admin.calendar.reason")}
          <input
            name="reason"
            defaultValue={seed.reason}
            placeholder={t(locale, "admin.calendar.reasonPlaceholder")}
            className="admin-input"
          />
          <FormErrorText error={saveState.fieldErrors.reason} />
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <SaveBlackoutButton isEditing={isEditing} locale={locale} />
          <button
            type="button"
            onClick={onClose}
            className="admin-button-secondary"
          >
            {t(locale, "common.cancel")}
          </button>
        </div>
      </form>

      {isEditing ? (
        <div className="admin-muted-panel px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
                {t(locale, "admin.services.danger")}
              </p>
              <p className="mt-2 text-sm leading-7 text-muted">
                {t(locale, "admin.calendar.deleteBlackoutDescription")}
              </p>
            </div>

            <form action={deleteAction}>
              <input type="hidden" name="businessSlug" value={businessSlug} />
              <input type="hidden" name="blackoutDateId" defaultValue={seed.blackoutDateId ?? ""} />
              <input type="hidden" name="locale" value={locale} />
              <DeleteBlackoutButton locale={locale} />
            </form>
          </div>

          {deleteState.status === "error" && deleteState.message ? (
            <p className="mt-3 text-sm text-rose-700">{deleteState.message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SaveBusinessHoursButton({
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
      {pending ? t(locale, "common.saving") : t(locale, "admin.calendar.saveBusinessHours")}
    </button>
  );
}

function BusinessHoursModalForm({
  seed,
  businessSlug,
  onClose,
  locale,
}: {
  seed: BusinessHoursModalSeed;
  businessSlug: string;
  onClose: () => void;
  locale: AppLocale;
}) {
  const router = useRouter();
  const [isClosed, setIsClosed] = useState(seed.isClosed);
  const [periods, setPeriods] = useState(() => sortBusinessPeriods(seed.periods));
  const [copyToDayOfWeek, setCopyToDayOfWeek] = useState<number[]>([]);
  const [editVersion, setEditVersion] = useState(0);
  const [submittedVersion, setSubmittedVersion] = useState(0);
  const [saveState, saveAction] = useActionState(
    upsertBusinessHoursAction,
    initialAdminEntityActionState,
  );
  const validation = validateBusinessPeriods({
    periods,
    isClosed,
    locale,
  });
  const showServerErrors = submittedVersion === editVersion;
  const periodSectionError =
    validation.formError ?? (showServerErrors ? saveState.fieldErrors.periods : undefined);
  const copyError =
    showServerErrors && !validation.hasErrors ? saveState.fieldErrors.copyToDayOfWeek : undefined;
  const copySelectionBlocked =
    isClosed || validation.hasErrors || validation.sortedPeriods.length === 0;
  const saveDisabled = validation.hasErrors || !!copyError;
  const isAtMaxPeriods = periods.length >= MAX_BUSINESS_PERIODS_PER_DAY;

  useEffect(() => {
    if (saveState.status === "success") {
      onClose();
      router.refresh();
    }
  }, [onClose, router, saveState.status]);

  function markDirty() {
    setEditVersion((currentVersion) => currentVersion + 1);
  }

  function addPeriod() {
    if (isAtMaxPeriods) {
      return;
    }

    setIsClosed(false);
    setPeriods((currentPeriods) =>
      sortBusinessPeriods([...currentPeriods, createDefaultBusinessPeriod(currentPeriods)]),
    );
    markDirty();
  }

  function updatePeriod(
    periodId: string,
    field: "openTime" | "closeTime",
    value: string,
  ) {
    setPeriods((currentPeriods) =>
      sortBusinessPeriods(
        currentPeriods.map((period) =>
          period.id === periodId
          ? {
              ...period,
              [field]: value,
            }
          : period,
        ),
      ),
    );
    markDirty();
  }

  function removePeriod(periodId: string) {
    setPeriods((currentPeriods) => currentPeriods.filter((period) => period.id !== periodId));
    markDirty();
  }

  function handleClosedChange(checked: boolean) {
    setIsClosed(checked);
    setCopyToDayOfWeek([]);

    if (!checked && periods.length === 0) {
      setPeriods([createDefaultBusinessPeriod([])]);
    }

    markDirty();
  }

  function toggleCopyDay(dayOfWeek: number) {
    setCopyToDayOfWeek((currentDays) =>
      currentDays.includes(dayOfWeek)
        ? currentDays.filter((value) => value !== dayOfWeek)
        : [...currentDays, dayOfWeek].sort((left, right) => left - right),
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
      <input type="hidden" name="dayOfWeek" value={seed.dayOfWeek} />
      <input type="hidden" name="locale" value={locale} />

      <ErrorBanner
        message={showServerErrors && saveState.status === "error" ? saveState.message ?? undefined : undefined}
      />

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
          name="isClosed"
          checked={isClosed}
          onChange={(event) => handleClosedChange(event.target.checked)}
          className="admin-checkbox"
        />
        {t(locale, "admin.calendar.closedAllDay")}
      </label>
      <FormErrorText error={showServerErrors ? saveState.fieldErrors.isClosed : undefined} />

      <div className="grid gap-4">
        <div className="admin-muted-panel px-4 py-4">
          <p className="text-sm text-muted">
            {isClosed
              ? t(locale, "admin.calendar.closedDayDescription")
              : t(locale, "admin.calendar.openDayDescription")}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-900">
              {t(locale, "admin.calendar.businessPeriods")}
            </p>
            <p className="mt-1 text-sm text-muted">
              {t(locale, "admin.calendar.businessPeriodsDescription")}
            </p>
          </div>

          <button
            type="button"
            onClick={addPeriod}
            disabled={isClosed || isAtMaxPeriods}
            className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t(locale, "admin.calendar.addBusinessPeriod")}
          </button>
        </div>

        {periods.length === 0 ? (
          <div className="admin-card-dashed px-5 py-5 text-sm text-muted">
            {isClosed
              ? t(locale, "admin.calendar.noPeriodsClosed")
              : t(locale, "admin.calendar.noPeriodsOpen")}
          </div>
        ) : (
          <div className="grid gap-3">
            {periods.map((period, index) => {
              const rowError = validation.rowErrors[index];
              const rowMessages =
                rowError.messages.length > 0
                  ? rowError.messages
                  : showServerErrors && saveState.fieldErrors[`periods.${index}.row`]
                    ? [saveState.fieldErrors[`periods.${index}.row`]]
                    : [];
              const openTimeError =
                rowError.openTime ??
                (showServerErrors ? saveState.fieldErrors[`periods.${index}.openTime`] : undefined);
              const closeTimeError =
                rowError.closeTime ??
                (showServerErrors ? saveState.fieldErrors[`periods.${index}.closeTime`] : undefined);

              return (
                <div
                  key={period.id}
                  className="admin-muted-panel admin-animated-panel grid gap-4 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {t(locale, "admin.calendar.businessPeriod", { number: index + 1 })}
                    </p>
                    <button
                      type="button"
                      onClick={() => removePeriod(period.id)}
                      disabled={isClosed}
                      className="admin-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {t(locale, "admin.calendar.remove")}
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium">
                      {t(locale, "admin.calendar.opens")}
                      {isClosed ? (
                        <>
                          <input
                            type="hidden"
                            name="openTime"
                            value={period.openTime}
                          />
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
                      {isClosed ? (
                        <>
                          <input
                            type="hidden"
                            name="closeTime"
                            value={period.closeTime}
                          />
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

                  <AnimatedFeedbackSlot isVisible={rowMessages.length > 0} variant="panel">
                    <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {rowMessages.join(" ")}
                    </div>
                  </AnimatedFeedbackSlot>
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
            : t(locale, "admin.calendar.periodsUsed", {
                used: periods.length,
                max: MAX_BUSINESS_PERIODS_PER_DAY,
              })}
        </p>
      </div>

      <div className="grid gap-4">
        <div>
          <p className="text-sm font-medium text-slate-900">
            {t(locale, "admin.calendar.copyPeriods")}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "admin.calendar.copyPeriodsDescription")}
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
          {isClosed
            ? t(locale, "admin.calendar.copyClosedHint")
            : validation.sortedPeriods.length === 0
              ? t(locale, "admin.calendar.copyNeedPeriodHint")
              : t(locale, "admin.calendar.copyReadyHint")}
        </p>
        <FormErrorText error={copyError} />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <SaveBusinessHoursButton disabled={saveDisabled} locale={locale} />
        <button
          type="button"
          onClick={onClose}
          className="admin-button-secondary"
        >
          {t(locale, "common.cancel")}
        </button>
      </div>
    </form>
  );
}

function EditIconButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="admin-icon-button"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="h-4.5 w-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3.5 16.5h3.2l8.6-8.6-3.2-3.2-8.6 8.6z" />
        <path d="m11.9 4.7 3.2 3.2" />
        <path d="M3.5 16.5h12.8" />
      </svg>
    </button>
  );
}

function BlackoutControls({
  searchQuery,
  onSearchChange,
  scopeFilter,
  onScopeFilterChange,
  timeFilter,
  onTimeFilterChange,
  viewMode,
  onViewModeChange,
  hasFilters,
  visibleCount,
  totalCount,
  onResetFilters,
  locale,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  scopeFilter: BlackoutScopeFilter;
  onScopeFilterChange: (value: BlackoutScopeFilter) => void;
  timeFilter: BlackoutTimeFilter;
  onTimeFilterChange: (value: BlackoutTimeFilter) => void;
  viewMode: AdminCollectionViewMode;
  onViewModeChange: (value: AdminCollectionViewMode) => void;
  hasFilters: boolean;
  visibleCount: number;
  totalCount: number;
  onResetFilters: () => void;
  locale: AppLocale;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(16rem,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] xl:items-center">
        <label className="grid gap-2 text-sm font-medium">
          <span className="sr-only">{t(locale, "admin.calendar.searchBlackouts")}</span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-muted">
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
                <circle cx="8.5" cy="8.5" r="4.75" />
                <path d="m12 12 4.5 4.5" />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t(locale, "admin.calendar.searchBlackouts")}
              className="admin-input admin-input-with-leading-icon h-12 rounded-[1rem] text-sm"
            />
          </div>
        </label>

        <label className="sr-only" htmlFor="blackout-scope-filter">
          {t(locale, "admin.calendar.scope")}
        </label>
        <div className="relative">
          <select
            id="blackout-scope-filter"
            value={scopeFilter}
            onChange={(event) => onScopeFilterChange(event.target.value as BlackoutScopeFilter)}
            className="admin-select admin-select-with-trailing-icon h-12 appearance-none rounded-[1rem] text-sm font-semibold"
          >
            {getBlackoutScopeOptions(locale).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted">
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

        <label className="sr-only" htmlFor="blackout-time-filter">
          {t(locale, "admin.calendar.timing")}
        </label>
        <div className="relative">
          <select
            id="blackout-time-filter"
            value={timeFilter}
            onChange={(event) => onTimeFilterChange(event.target.value as BlackoutTimeFilter)}
            className="admin-select admin-select-with-trailing-icon h-12 appearance-none rounded-[1rem] text-sm font-semibold"
          >
            {getBlackoutTimeOptions(locale).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted">
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

        <div className="flex justify-start xl:justify-end">
          <CollectionViewModeButton
            viewMode={viewMode}
            onChange={onViewModeChange}
            locale={locale}
          />
        </div>
      </div>

      <div className="flex min-h-[1.75rem] flex-wrap items-center gap-3 text-sm leading-6 text-muted">
        <span>
          {t(locale, "admin.calendar.showingBlackouts", {
            visible: visibleCount,
            total: totalCount,
          })}
        </span>
        {hasFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="admin-link"
          >
            {t(locale, "common.clearFilters")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AddBlackoutCard({ onCreate, locale }: { onCreate: () => void; locale: AppLocale }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="admin-card-dashed group flex min-h-[18rem] flex-col items-start justify-between p-6 text-left transition hover:border-slate-400 hover:bg-slate-50"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-slate-50 text-muted transition group-hover:border-slate-400 group-hover:text-slate-900">
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
          <path d="M10 4v12" />
          <path d="M4 10h12" />
        </svg>
      </div>

      <div>
        <p className="text-xl font-semibold text-slate-900">
          {t(locale, "admin.calendar.addBlackout")}
        </p>
        <p className="mt-3 max-w-sm text-sm leading-7 text-muted">
          {t(locale, "admin.calendar.addBlackoutDescription")}
        </p>
      </div>
    </button>
  );
}

function BlackoutCard({
  blackout,
  onEdit,
  locale,
}: {
  blackout: BlackoutRecord;
  onEdit: (blackout: BlackoutRecord) => void;
  locale: AppLocale;
}) {
  const timingStatus = getBlackoutTimingStatus(blackout, new Date(), locale);

  return (
    <article className="admin-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold text-slate-900">
            {blackout.reason ?? t(locale, "common.blockedTime")}
          </p>
          <p className="mt-2 text-sm text-muted">
            {blackout.staffMember?.name ?? t(locale, "common.entireBusiness")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-surface px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
            {timingStatus}
          </span>
          <EditIconButton
            label={t(locale, "admin.calendar.editBlackoutLabel", {
              name: blackout.reason ?? t(locale, "admin.calendar.blackoutDates"),
            })}
            onClick={() => onEdit(blackout)}
          />
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-muted">
        {formatBlackoutRange(blackout.startsAt, blackout.endsAt, locale)}
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {blackout.staffMemberId
            ? t(locale, "admin.calendar.staffSpecific")
            : t(locale, "admin.calendar.businessWide")}
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {format(blackout.startsAt, "MMM d", { locale: getDateFnsLocale(locale) })}
        </span>
      </div>
    </article>
  );
}

function AddBlackoutListRow({ onCreate, locale }: { onCreate: () => void; locale: AppLocale }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="flex w-full flex-col gap-3 px-5 py-5 text-left transition hover:bg-slate-50"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-border bg-surface text-muted">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="h-4.5 w-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 4v12" />
            <path d="M4 10h12" />
          </svg>
        </span>
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {t(locale, "admin.calendar.addBlackout")}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t(locale, "admin.calendar.addBlackoutListDescription")}
          </p>
        </div>
      </div>
    </button>
  );
}

function BlackoutListRow({
  blackout,
  onEdit,
  locale,
}: {
  blackout: BlackoutRecord;
  onEdit: (blackout: BlackoutRecord) => void;
  locale: AppLocale;
}) {
  return (
    <article className="flex flex-col gap-4 px-5 py-5 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto] md:items-center md:gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-lg font-semibold text-slate-900">
            {blackout.reason ?? t(locale, "common.blockedTime")}
          </p>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
            {blackout.staffMemberId
              ? t(locale, "admin.calendar.staffSpecific")
              : t(locale, "admin.calendar.businessWide")}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted">
          {blackout.staffMember?.name ?? t(locale, "common.entireBusiness")} ·{" "}
          {formatBlackoutRange(blackout.startsAt, blackout.endsAt, locale)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {getBlackoutTimingStatus(blackout, new Date(), locale)}
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {format(blackout.startsAt, "MMM d", { locale: getDateFnsLocale(locale) })}
        </span>
      </div>

      <div className="flex justify-start md:justify-end">
        <EditIconButton
          label={t(locale, "admin.calendar.editBlackoutLabel", {
            name: blackout.reason ?? t(locale, "admin.calendar.blackoutDates"),
          })}
          onClick={() => onEdit(blackout)}
        />
      </div>
    </article>
  );
}

function EmptyBlackoutResults({
  hasFilters,
  onResetFilters,
  onCreate,
  locale,
}: {
  hasFilters: boolean;
  onResetFilters: () => void;
  onCreate: () => void;
  locale: AppLocale;
}) {
  return (
    <div className="admin-card-dashed px-6 py-10 text-center">
      <h2 className="text-xl font-semibold text-slate-900">
        {hasFilters
          ? t(locale, "admin.calendar.noBlackoutsMatch")
          : t(locale, "admin.calendar.noBlackoutsYet")}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted">
        {hasFilters
          ? t(locale, "admin.calendar.noBlackoutsMatchDescription")
          : t(locale, "admin.calendar.noBlackoutsYetDescription")}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {hasFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="admin-button-secondary"
          >
            {t(locale, "common.resetFilters")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCreate}
          className="admin-button-primary"
        >
          {t(locale, "admin.calendar.addBlackout")}
        </button>
      </div>
    </div>
  );
}

function BusinessHoursListRow({
  entry,
  onEdit,
  locale,
}: {
  entry: BusinessHoursDay;
  onEdit: (entry: BusinessHoursDay) => void;
  locale: AppLocale;
}) {
  return (
    <article className="flex flex-col gap-4 px-5 py-5 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_auto] md:items-center md:gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-lg font-semibold text-slate-900">
            {getLocalizedDayLabel(entry.dayOfWeek, locale)}
          </p>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
            {entry.isClosed ? t(locale, "common.closed") : t(locale, "common.open")}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted">{formatBusinessHoursLabel(entry, locale)}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {entry.isClosed
            ? entry.periods.length > 0
              ? t(locale, "admin.calendar.savedForReopening")
              : t(locale, "admin.calendar.noSavedPeriods")
            : t(locale, "admin.calendar.overlayActive")}
        </span>
        {entry.periods.length > 0 ? (
          <span className="rounded-full border border-border bg-surface px-3 py-2">
            {t(locale, "admin.calendar.periodCount", { count: entry.periods.length })}
          </span>
        ) : null}
      </div>

      <div className="flex justify-start md:justify-end">
        <EditIconButton
          label={t(locale, "admin.calendar.editDay", {
            day: getLocalizedDayLabel(entry.dayOfWeek, locale),
          })}
          onClick={() => onEdit(entry)}
        />
      </div>
    </article>
  );
}

export default function CalendarManager({
  businessSlug,
  businessHours,
  staffMembers,
  appointments,
  blackoutDates,
  locale,
}: CalendarManagerProps) {
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>("month");
  const [focusDate, setFocusDate] = useState(() =>
    getInitialFocusDate(appointments, blackoutDates),
  );
  const [selectedStaffId, setSelectedStaffId] = useState("all");
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [blackoutModalSeed, setBlackoutModalSeed] = useState<BlackoutModalSeed | null>(null);
  const [businessHoursModalSeed, setBusinessHoursModalSeed] =
    useState<BusinessHoursModalSeed | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [scopeFilter, setScopeFilter] = useState<BlackoutScopeFilter>("all");
  const [timeFilter, setTimeFilter] = useState<BlackoutTimeFilter>("all");
  const [blackoutViewMode, setBlackoutViewMode] = useSessionCollectionViewMode(
    BLACKOUT_VIEW_STORAGE_KEY,
  );

  const selectedStaffMember =
    selectedStaffId === "all"
      ? null
      : staffMembers.find((staffMember) => staffMember.id === selectedStaffId) ?? null;

  const calendarItems = buildCalendarItems(appointments, blackoutDates, selectedStaffId, locale);
  const rangeStart = getCalendarRangeStart(focusDate, calendarViewMode);
  const rangeEnd = getCalendarRangeEnd(focusDate, calendarViewMode);
  const visibleRangeEnd = addDays(startOfDay(rangeEnd), 1);
  const visibleDays = getVisibleDays(focusDate, calendarViewMode);
  const workingWindowsByDay = visibleDays.map((day) =>
    getWorkingWindowsForDay(day, selectedStaffMember, businessHours),
  );
  const visibleCalendarItems = calendarItems.filter((item) =>
    overlaps(item.startsAt, item.endsAt, rangeStart, visibleRangeEnd),
  );
  const visibleAppointmentsCount = visibleCalendarItems.filter(
    (item) => item.kind === "appointment",
  ).length;
  const visibleBlackoutsCount = visibleCalendarItems.filter(
    (item) => item.kind === "blackout",
  ).length;
  const selectedItem =
    selectedItemKey !== null
      ? visibleCalendarItems.find((item) => item.key === selectedItemKey) ?? null
      : null;
  const rangeLabel = getRangeLabel(focusDate, calendarViewMode, locale);

  const now = new Date();
  const filteredBlackoutDates = blackoutDates
    .filter((blackout) => matchesBlackoutSearch(blackout, deferredSearchQuery.trim(), locale))
    .filter((blackout) => matchesBlackoutScope(blackout, scopeFilter))
    .filter((blackout) => matchesBlackoutTime(blackout, timeFilter, now))
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
  const hasBlackoutFilters =
    deferredSearchQuery.trim().length > 0 || scopeFilter !== "all" || timeFilter !== "all";
  const blackoutModalKey = blackoutModalSeed
    ? `${blackoutModalSeed.mode}-${blackoutModalSeed.blackoutDateId ?? blackoutModalSeed.startsAt}`
    : "closed";

  function openCreateBlackoutModal() {
    setBlackoutModalSeed(buildBlackoutSeed(focusDate, selectedStaffMember, businessHours));
  }

  function openEditBlackoutModal(blackout: BlackoutRecord) {
    setBlackoutModalSeed(createEditBlackoutSeed(blackout));
  }

  function closeBlackoutModal() {
    setBlackoutModalSeed(null);
  }

  function openBusinessHoursModal(entry: BusinessHoursDay) {
    setBusinessHoursModalSeed(createBusinessHoursSeed(entry));
  }

  function closeBusinessHoursModal() {
    setBusinessHoursModalSeed(null);
  }

  function resetBlackoutFilters() {
    setSearchQuery("");
    setScopeFilter("all");
    setTimeFilter("all");
  }

  return (
    <>
      <section className="grid gap-6">
        <CalendarToolbar
          viewMode={calendarViewMode}
          onViewModeChange={setCalendarViewMode}
          rangeLabel={rangeLabel}
          onPrevious={() =>
            setFocusDate((currentDate: Date) =>
              shiftFocusDate(currentDate, calendarViewMode, "prev"),
            )
          }
          onToday={() => setFocusDate(startOfDay(new Date()))}
          onNext={() =>
            setFocusDate((currentDate: Date) =>
              shiftFocusDate(currentDate, calendarViewMode, "next"),
            )
          }
          selectedStaffId={selectedStaffId}
          onSelectedStaffIdChange={setSelectedStaffId}
          staffMembers={staffMembers}
          locale={locale}
        />

        {calendarViewMode === "month" ? (
          <MonthView
            focusDate={focusDate}
            days={visibleDays}
            items={visibleCalendarItems}
            selectedItemKey={selectedItemKey}
            workingWindowsByDay={workingWindowsByDay}
            onSelectItem={(item) => setSelectedItemKey(item.key)}
            locale={locale}
          />
        ) : (
          <TimeGridView
            days={visibleDays}
            items={visibleCalendarItems}
            selectedItemKey={selectedItemKey}
            workingWindowsByDay={workingWindowsByDay}
            onSelectItem={(item) => setSelectedItemKey(item.key)}
            locale={locale}
          />
        )}

        <div className="grid gap-4 md:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1.2fr)]">
          <CalendarLegendCard locale={locale} />
          <PeriodSnapshotCard
            businessSlug={businessSlug}
            rangeLabel={rangeLabel}
            selectedStaffMember={selectedStaffMember}
            visibleAppointmentsCount={visibleAppointmentsCount}
            visibleBlackoutsCount={visibleBlackoutsCount}
            selectedItem={selectedItem}
            onEditBlackout={openEditBlackoutModal}
            locale={locale}
          />
        </div>

        <div className="grid gap-4">
          <section data-locale-section="" data-locale-section-order="4" className="admin-panel p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
              {t(locale, "admin.calendar.schedulingConfiguration")}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">
              {t(locale, "admin.calendar.calendarSettings")}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              {t(locale, "admin.calendar.configurationDescription")}
            </p>
          </section>

          <section data-locale-section="" data-locale-section-order="5" className="admin-panel p-6">
            <div className="grid gap-5">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {t(locale, "admin.calendar.blackoutDates")}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted">
                  {t(locale, "admin.calendar.blackoutDescription")}
                </p>
              </div>

              <BlackoutControls
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                scopeFilter={scopeFilter}
                onScopeFilterChange={setScopeFilter}
                timeFilter={timeFilter}
                onTimeFilterChange={setTimeFilter}
                viewMode={blackoutViewMode}
                onViewModeChange={setBlackoutViewMode}
                hasFilters={hasBlackoutFilters}
                visibleCount={filteredBlackoutDates.length}
                totalCount={blackoutDates.length}
                onResetFilters={resetBlackoutFilters}
                locale={locale}
              />

              {filteredBlackoutDates.length === 0 ? (
                <EmptyBlackoutResults
                  hasFilters={hasBlackoutFilters}
                  onResetFilters={resetBlackoutFilters}
                  onCreate={openCreateBlackoutModal}
                  locale={locale}
                />
              ) : (
                <CollectionViewTransition
                  viewMode={blackoutViewMode}
                  cards={
                    <CardGrid>
                      <AddBlackoutCard
                        key="create-blackout"
                        onCreate={openCreateBlackoutModal}
                        locale={locale}
                      />
                      {filteredBlackoutDates.map((blackout) => (
                        <BlackoutCard
                          key={blackout.id}
                          blackout={blackout}
                          onEdit={openEditBlackoutModal}
                          locale={locale}
                        />
                      ))}
                    </CardGrid>
                  }
                  list={
                    <ListView>
                      <AddBlackoutListRow
                        key="create-blackout-row"
                        onCreate={openCreateBlackoutModal}
                        locale={locale}
                      />
                      {filteredBlackoutDates.map((blackout) => (
                        <div key={blackout.id} className="border-t border-border">
                          <BlackoutListRow
                            blackout={blackout}
                            onEdit={openEditBlackoutModal}
                            locale={locale}
                          />
                        </div>
                      ))}
                    </ListView>
                  }
                />
              )}
            </div>
          </section>

          <section data-locale-section="" data-locale-section-order="5" className="admin-panel p-6">
            <div className="grid gap-5">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {t(locale, "admin.calendar.businessHours")}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
                  {t(locale, "admin.calendar.businessHoursDescription")}
                </p>
              </div>

              <ListView>
                {businessHours.map((entry, index) => (
                  <div
                    key={entry.dayOfWeek}
                    className={index === 0 ? "" : "border-t border-border"}
                  >
                    <BusinessHoursListRow
                      entry={entry}
                      onEdit={openBusinessHoursModal}
                      locale={locale}
                    />
                  </div>
                ))}
              </ListView>
            </div>
          </section>
        </div>
      </section>

      <CreateEntityModal
        eyebrow={
          blackoutModalSeed?.mode === "edit"
            ? t(locale, "admin.calendar.editBlackoutEyebrow")
            : t(locale, "admin.calendar.createBlackoutEyebrow")
        }
        title={
          blackoutModalSeed?.mode === "edit"
            ? t(locale, "admin.calendar.adjustBlackout")
            : t(locale, "admin.calendar.addBlackoutTitle")
        }
        description={t(locale, "admin.calendar.blackoutModalDescription")}
        isOpen={blackoutModalSeed !== null}
        onClose={closeBlackoutModal}
        closeLabel={t(locale, "common.close")}
        closeAriaLabel={t(locale, "common.closeDialog")}
      >
        {blackoutModalSeed ? (
          <BlackoutModalForm
            key={blackoutModalKey}
            businessSlug={businessSlug}
            seed={blackoutModalSeed}
            staffMembers={staffMembers}
            onClose={closeBlackoutModal}
            locale={locale}
          />
        ) : null}
      </CreateEntityModal>

      <CreateEntityModal
        eyebrow={t(locale, "admin.calendar.editBusinessHours")}
        title={
          businessHoursModalSeed
            ? t(locale, "admin.calendar.updateDay", {
                day: getLocalizedDayLabel(businessHoursModalSeed.dayOfWeek, locale),
              })
            : t(locale, "admin.calendar.updateBusinessHours")
        }
        description={t(locale, "admin.calendar.businessHoursModalDescription")}
        isOpen={businessHoursModalSeed !== null}
        onClose={closeBusinessHoursModal}
        closeLabel={t(locale, "common.close")}
        closeAriaLabel={t(locale, "common.closeDialog")}
      >
        {businessHoursModalSeed ? (
          <BusinessHoursModalForm
            key={`business-hours-${businessHoursModalSeed.dayOfWeek}`}
            businessSlug={businessSlug}
            seed={businessHoursModalSeed}
            onClose={closeBusinessHoursModal}
            locale={locale}
          />
        ) : null}
      </CreateEntityModal>
    </>
  );
}
