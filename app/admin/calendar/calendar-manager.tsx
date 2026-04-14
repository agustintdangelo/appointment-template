"use client";

import Link from "next/link";
import { useActionState, useDeferredValue, useEffect, useState } from "react";
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
import {
  initialAdminEntityActionState,
  type AdminCollectionViewMode,
} from "@/app/admin/components/admin-collection-types";
import CreateEntityModal from "@/app/admin/components/create-entity-modal";
import ListView from "@/app/admin/components/list-view";
import useSessionCollectionViewMode from "@/app/admin/components/use-session-collection-view";
import {
  dayOptions,
  formatBlackoutRange,
  getDayLabel,
  getLocalDateTimeInputValue,
} from "@/lib/admin";
import { formatAppointmentDateTime } from "@/lib/format";

type BusinessHoursRecord = {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

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
  businessHours: BusinessHoursRecord[];
  staffMembers: StaffRecord[];
  appointments: AppointmentRecord[];
  blackoutDates: BlackoutRecord[];
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
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

const CALENDAR_WEEK_STARTS_ON = 0;
const DEFAULT_GRID_START_HOUR = 7;
const DEFAULT_GRID_END_HOUR = 20;
const GRID_HOUR_HEIGHT = 56;
const MIN_EVENT_HEIGHT = 28;
const BLACKOUT_VIEW_STORAGE_KEY = "appointment-admin-calendar-blackouts-view-mode";

const calendarViewOptions: Array<{
  value: CalendarViewMode;
  label: string;
}> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const blackoutScopeOptions: Array<{
  value: BlackoutScopeFilter;
  label: string;
}> = [
  { value: "all", label: "All scopes" },
  { value: "business", label: "Business-wide" },
  { value: "staff", label: "Staff-specific" },
];

const blackoutTimeOptions: Array<{
  value: BlackoutTimeFilter;
  label: string;
}> = [
  { value: "all", label: "All timings" },
  { value: "upcoming", label: "Upcoming" },
  { value: "active", label: "Active now" },
  { value: "past", label: "Past" },
];

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

function getRangeLabel(focusDate: Date, viewMode: CalendarViewMode) {
  if (viewMode === "day") {
    return format(focusDate, "EEEE, MMMM d, yyyy");
  }

  if (viewMode === "week") {
    const weekStart = startOfWeek(focusDate, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
    const weekEnd = endOfWeek(focusDate, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });

    if (format(weekStart, "MMM yyyy") === format(weekEnd, "MMM yyyy")) {
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "d, yyyy")}`;
    }

    return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  }

  return format(focusDate, "MMMM yyyy");
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
      ? "border-accent bg-accent/18 text-foreground shadow-[0_16px_35px_-24px_rgba(27,98,90,0.75)]"
      : "border-accent/25 bg-accent/10 text-foreground";
  }

  if (status === "PENDING") {
    return isSelected
      ? "border-highlight bg-highlight-surface text-highlight-foreground shadow-[0_16px_35px_-24px_rgba(242,199,187,0.9)]"
      : "border-highlight/70 bg-highlight-surface text-highlight-foreground";
  }

  return isSelected
    ? "border-border bg-surface text-foreground shadow-[0_16px_35px_-24px_rgba(34,29,24,0.24)]"
    : "border-border bg-card text-muted";
}

function getBlackoutClasses(isSelected: boolean) {
  return isSelected
    ? "border-highlight bg-highlight-surface text-highlight-foreground shadow-[0_16px_35px_-24px_rgba(242,199,187,0.9)]"
    : "border-highlight/75 bg-highlight-surface text-highlight-foreground";
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
      title: blackout.reason ?? "Blocked time",
      subtitle: blackout.staffMember?.name ?? "Entire business",
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
  businessHours: BusinessHoursRecord[],
) {
  const businessHoursForDay = businessHours.find((entry) => entry.dayOfWeek === getDay(date));

  if (!businessHoursForDay || businessHoursForDay.isClosed) {
    return [] as WorkingWindow[];
  }

  const businessStart = combineDateAndTime(date, businessHoursForDay.openTime);
  const businessEnd = combineDateAndTime(date, businessHoursForDay.closeTime);

  if (!selectedStaffMember) {
    return [
      {
        startAt: businessStart,
        endAt: businessEnd,
      },
    ];
  }

  return selectedStaffMember.availabilities
    .filter((availability) => availability.dayOfWeek === getDay(date) && !availability.isOff)
    .map((availability) => {
      const availabilityStart = combineDateAndTime(date, availability.startTime);
      const availabilityEnd = combineDateAndTime(date, availability.endTime);

      return {
        startAt:
          availabilityStart.getTime() > businessStart.getTime() ? availabilityStart : businessStart,
        endAt: availabilityEnd.getTime() < businessEnd.getTime() ? availabilityEnd : businessEnd,
      };
    })
    .filter((window) => window.startAt.getTime() < window.endAt.getTime());
}

function getWindowSummary(windows: WorkingWindow[]) {
  if (windows.length === 0) {
    return "Closed";
  }

  return windows
    .map((window) => `${format(window.startAt, "h:mm a")} - ${format(window.endAt, "h:mm a")}`)
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

function getBlackoutTimingStatus(blackout: BlackoutRecord, now: Date) {
  if (blackout.startsAt.getTime() <= now.getTime() && blackout.endsAt.getTime() > now.getTime()) {
    return "Active now";
  }

  if (blackout.startsAt.getTime() > now.getTime()) {
    return "Upcoming";
  }

  return "Past";
}

function matchesBlackoutSearch(blackout: BlackoutRecord, query: string) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();

  return [
    blackout.reason ?? "",
    blackout.staffMember?.name ?? "Entire business",
    formatBlackoutRange(blackout.startsAt, blackout.endsAt),
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
  businessHours: BusinessHoursRecord[],
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

function createBusinessHoursSeed(entry: BusinessHoursRecord): BusinessHoursModalSeed {
  return {
    dayOfWeek: entry.dayOfWeek,
    openTime: entry.openTime,
    closeTime: entry.closeTime,
    isClosed: entry.isClosed,
  };
}

function formatBusinessHoursLabel(entry: BusinessHoursRecord) {
  if (entry.isClosed) {
    return "Closed all day";
  }

  const referenceDate = getReferenceDateForDay(entry.dayOfWeek);

  return `${format(combineDateAndTime(referenceDate, entry.openTime), "h:mm a")} - ${format(
    combineDateAndTime(referenceDate, entry.closeTime),
    "h:mm a",
  )}`;
}

function FormErrorText({ error }: { error?: string }) {
  if (!error) {
    return null;
  }

  return <p className="text-sm text-highlight">{error}</p>;
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
}) {
  return (
    <section className="rounded-[1.8rem] border border-border bg-surface/95 px-4 py-4 shadow-[0_24px_70px_-55px_rgba(34,29,24,0.35)] sm:px-5">
      <div className="grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPrevious}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent"
          >
            Next
          </button>
        </div>

        <div className="min-w-0">
          <p className="truncate text-center font-display text-3xl sm:text-4xl">{rangeLabel}</p>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
          <label className="sr-only" htmlFor="calendar-staff-scope">
            Staff scope
          </label>
          <div className="relative">
            <select
              id="calendar-staff-scope"
              value={selectedStaffId}
              onChange={(event) => onSelectedStaffIdChange(event.target.value)}
              className="h-11 min-w-[11rem] appearance-none rounded-full border border-border bg-card px-4 pr-10 text-sm font-semibold outline-none transition focus:border-accent"
            >
              <option value="all">All staff</option>
              {staffMembers.map((staffMember) => (
                <option key={staffMember.id} value={staffMember.id}>
                  {staffMember.name}
                  {staffMember.isActive ? "" : " (inactive)"}
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

          <div className="flex rounded-full border border-border bg-card p-1">
            {calendarViewOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onViewModeChange(option.value)}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                  viewMode === option.value
                    ? "brand-accent-fill"
                    : "text-muted hover:text-accent"
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

function CalendarLegendCard() {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card/95 p-5 shadow-[0_24px_70px_-55px_rgba(34,29,24,0.35)]">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Legend</p>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="flex items-center gap-3">
          <span className="h-3.5 w-3.5 rounded-full bg-accent/35" />
          <span>Appointments</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3.5 w-3.5 rounded-full bg-highlight" />
          <span>Blackout dates</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3.5 w-3.5 rounded-full bg-accent/10 ring-1 ring-accent/20" />
          <span>Working hours overlay</span>
        </div>
      </div>
    </section>
  );
}

function PeriodSnapshotCard({
  rangeLabel,
  selectedStaffMember,
  visibleAppointmentsCount,
  visibleBlackoutsCount,
  selectedItem,
  onEditBlackout,
}: {
  rangeLabel: string;
  selectedStaffMember: StaffRecord | null;
  visibleAppointmentsCount: number;
  visibleBlackoutsCount: number;
  selectedItem: CalendarItem | null;
  onEditBlackout: (blackout: BlackoutRecord) => void;
}) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-card/95 p-5 shadow-[0_24px_70px_-55px_rgba(34,29,24,0.35)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
            Period snapshot
          </p>
          <h3 className="mt-2 font-display text-3xl">{rangeLabel}</h3>
        </div>
        <span className="rounded-full border border-border bg-surface px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted">
          {selectedStaffMember ? selectedStaffMember.name : "All staff"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.1rem] border border-border bg-surface/90 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Appointments
          </p>
          <p className="mt-2 font-display text-3xl">{visibleAppointmentsCount}</p>
        </div>
        <div className="rounded-[1.1rem] border border-border bg-surface/90 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Blackout dates
          </p>
          <p className="mt-2 font-display text-3xl">{visibleBlackoutsCount}</p>
        </div>
      </div>

      <div className="mt-5 rounded-[1.1rem] border border-border bg-surface/85 px-4 py-4">
        {selectedItem ? (
          selectedItem.kind === "blackout" ? (
            <div className="grid gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Selected blackout
                </p>
                <p className="mt-2 text-base font-semibold">
                  {selectedItem.blackout.reason ?? "Blocked time"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {formatBlackoutRange(selectedItem.blackout.startsAt, selectedItem.blackout.endsAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEditBlackout(selectedItem.blackout)}
                className="w-fit rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent"
              >
                Edit blackout date
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  Selected appointment
                </p>
                <p className="mt-2 text-base font-semibold">{selectedItem.appointment.service.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {selectedItem.appointment.customerName} ·{" "}
                  {formatAppointmentDateTime(selectedItem.appointment.startAt)}
                </p>
              </div>
              <Link
                href="/admin/appointments"
                className="w-fit rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent"
              >
                Open appointments
              </Link>
            </div>
          )
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Selection
            </p>
            <p className="mt-2 text-sm text-muted">
              Select an appointment or blackout date in the calendar for a quick summary here.
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
}: {
  focusDate: Date;
  days: Date[];
  items: CalendarItem[];
  selectedItemKey: string | null;
  workingWindowsByDay: WorkingWindow[][];
  onSelectItem: (item: CalendarItem) => void;
}) {
  const dayNames = dayOptions.map((day) => day.label.slice(0, 3));

  return (
    <section className="overflow-hidden rounded-[2rem] border border-border bg-card/95 shadow-[0_24px_70px_-55px_rgba(34,29,24,0.35)]">
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
              } ${isSameMonth(day, focusDate) ? "bg-card/95" : "bg-surface/65"}`}
            >
              <div>
                <p
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-semibold ${
                    isToday(day)
                      ? "brand-accent-fill"
                      : isSameMonth(day, focusDate)
                        ? "bg-surface text-foreground"
                        : "bg-surface text-muted"
                  }`}
                >
                  {format(day, "d")}
                </p>
                <p className="mt-2 text-[0.7rem] text-muted">{getWindowSummary(dayWindows)}</p>
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
                      {format(item.startsAt, "h:mm a")}
                    </p>
                    <p className="mt-1 line-clamp-1 text-sm font-semibold">{item.title}</p>
                    <p className="line-clamp-1 text-xs opacity-75">{item.subtitle}</p>
                  </button>
                ))}

                {overflowCount > 0 ? (
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
                    +{overflowCount} more
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
}: {
  days: Date[];
  items: CalendarItem[];
  selectedItemKey: string | null;
  workingWindowsByDay: WorkingWindow[][];
  onSelectItem: (item: CalendarItem) => void;
}) {
  const { startHour, endHour } = getGridBounds(days, items, workingWindowsByDay);
  const totalHours = Math.max(1, endHour - startHour);
  const gridHeight = totalHours * GRID_HOUR_HEIGHT;
  const hourMarks = Array.from({ length: totalHours + 1 }, (_, index) => startHour + index);
  const isMultiDay = days.length > 1;
  const gridTemplateColumns = `4rem repeat(${days.length}, minmax(0, 1fr))`;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-border bg-card/95 shadow-[0_24px_70px_-55px_rgba(34,29,24,0.35)]">
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
                {format(day, "EEE")}
              </p>
              <div className={`mt-2 ${isMultiDay ? "grid gap-1" : "flex items-center gap-3"}`}>
                <p
                  className={`font-display ${
                    isMultiDay ? "text-2xl sm:text-3xl" : "text-3xl"
                  } ${isToday(day) ? "text-accent" : "text-foreground"}`}
                >
                  {format(day, "d")}
                </p>
                <p className="line-clamp-2 text-[0.7rem] leading-4 text-muted sm:text-xs">
                  {getWindowSummary(workingWindowsByDay[index] ?? [])}
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
                  {format(combineDateAndTime(new Date(), `${String(hour).padStart(2, "0")}:00`), "h a")}
                </div>
              ))}
            </div>
          </div>

          {days.map((day, index) => {
            const positionedItems = getPositionedItemsForDay(day, items, startHour, endHour);

            return (
              <div
                key={day.toISOString()}
                className={`border-border bg-card/95 ${index === days.length - 1 ? "" : "border-r"}`}
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
                        className="absolute inset-x-1.5 rounded-[1rem] border border-accent/10 bg-accent/6 sm:inset-x-2"
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
                        {format(item.startsAt, "h:mm a")}
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

function SaveBlackoutButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="brand-accent-fill rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save blackout date" : "Create blackout date"}
    </button>
  );
}

function DeleteBlackoutButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Deleting..." : "Delete blackout date"}
    </button>
  );
}

function BlackoutModalForm({
  seed,
  staffMembers,
  onClose,
}: {
  seed: BlackoutModalSeed;
  staffMembers: StaffRecord[];
  onClose: () => void;
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
        <input type="hidden" name="blackoutDateId" defaultValue={seed.blackoutDateId ?? ""} />

        {saveState.status === "error" && saveState.message ? (
          <div className="rounded-[1.5rem] border border-highlight bg-highlight-surface px-4 py-3 text-sm text-highlight-foreground">
            {saveState.message}
          </div>
        ) : null}

        <label className="grid gap-2 text-sm font-medium">
          Applies to
          <select
            name="staffMemberId"
            defaultValue={seed.staffMemberId}
            className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
          >
            <option value="">Entire business</option>
            {staffMembers.map((staffMember) => (
              <option key={staffMember.id} value={staffMember.id}>
                {staffMember.name}
                {staffMember.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </select>
          <FormErrorText error={saveState.fieldErrors.staffMemberId} />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Starts
            <input
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={seed.startsAt}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
            <FormErrorText error={saveState.fieldErrors.startsAt} />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Ends
            <input
              name="endsAt"
              type="datetime-local"
              required
              defaultValue={seed.endsAt}
              className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
            />
            <FormErrorText error={saveState.fieldErrors.endsAt} />
          </label>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Reason
          <input
            name="reason"
            defaultValue={seed.reason}
            placeholder="Studio closure, training, meeting, vacation..."
            className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
          />
          <FormErrorText error={saveState.fieldErrors.reason} />
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <SaveBlackoutButton isEditing={isEditing} />
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-surface"
          >
            Cancel
          </button>
        </div>
      </form>

      {isEditing ? (
        <div className="rounded-[1.5rem] border border-border bg-surface/70 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">
                Danger zone
              </p>
              <p className="mt-2 text-sm leading-7 text-muted">
                Delete this blackout date only if the time should become available again.
              </p>
            </div>

            <form action={deleteAction}>
              <input type="hidden" name="blackoutDateId" defaultValue={seed.blackoutDateId ?? ""} />
              <DeleteBlackoutButton />
            </form>
          </div>

          {deleteState.status === "error" && deleteState.message ? (
            <p className="mt-3 text-sm text-highlight">{deleteState.message}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SaveBusinessHoursButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="brand-accent-fill rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save business hours"}
    </button>
  );
}

function BusinessHoursModalForm({
  seed,
  onClose,
}: {
  seed: BusinessHoursModalSeed;
  onClose: () => void;
}) {
  const router = useRouter();
  const [saveState, saveAction] = useActionState(
    upsertBusinessHoursAction,
    initialAdminEntityActionState,
  );

  useEffect(() => {
    if (saveState.status === "success") {
      onClose();
      router.refresh();
    }
  }, [onClose, router, saveState.status]);

  return (
    <form action={saveAction} className="grid gap-5">
      <input type="hidden" name="dayOfWeek" value={seed.dayOfWeek} />

      {saveState.status === "error" && saveState.message ? (
        <div className="rounded-[1.5rem] border border-highlight bg-highlight-surface px-4 py-3 text-sm text-highlight-foreground">
          {saveState.message}
        </div>
      ) : null}

      <div className="rounded-[1.2rem] border border-border bg-surface/85 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Day</p>
        <p className="mt-2 font-display text-3xl">{getDayLabel(seed.dayOfWeek)}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Opens
          <input
            name="openTime"
            type="time"
            defaultValue={seed.openTime}
            className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
          />
          <FormErrorText error={saveState.fieldErrors.openTime} />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          Closes
          <input
            name="closeTime"
            type="time"
            defaultValue={seed.closeTime}
            className="rounded-2xl border border-border bg-surface px-4 py-3 outline-none transition focus:border-accent"
          />
          <FormErrorText error={saveState.fieldErrors.closeTime} />
        </label>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          name="isClosed"
          defaultChecked={seed.isClosed}
          className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
        />
        Closed all day
      </label>
      <FormErrorText error={saveState.fieldErrors.isClosed} />

      <div className="flex flex-wrap gap-3 pt-2">
        <SaveBusinessHoursButton />
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-border px-5 py-3 text-sm font-semibold transition hover:bg-surface"
        >
          Cancel
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
      className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted transition hover:border-accent hover:text-accent"
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
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(16rem,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] xl:items-center">
        <label className="grid gap-2 text-sm font-medium">
          <span className="sr-only">Search blackout dates</span>
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
              placeholder="Search blackout dates"
              className="h-12 w-full rounded-[1.4rem] border border-border bg-card pl-14 pr-4 text-sm outline-none transition focus:border-accent"
            />
          </div>
        </label>

        <label className="sr-only" htmlFor="blackout-scope-filter">
          Scope
        </label>
        <div className="relative">
          <select
            id="blackout-scope-filter"
            value={scopeFilter}
            onChange={(event) => onScopeFilterChange(event.target.value as BlackoutScopeFilter)}
            className="h-12 w-full appearance-none rounded-[1.35rem] border border-border bg-card px-4 pr-12 text-sm font-semibold outline-none transition focus:border-accent"
          >
            {blackoutScopeOptions.map((option) => (
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
          Timing
        </label>
        <div className="relative">
          <select
            id="blackout-time-filter"
            value={timeFilter}
            onChange={(event) => onTimeFilterChange(event.target.value as BlackoutTimeFilter)}
            className="h-12 w-full appearance-none rounded-[1.35rem] border border-border bg-card px-4 pr-12 text-sm font-semibold outline-none transition focus:border-accent"
          >
            {blackoutTimeOptions.map((option) => (
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
          <CollectionViewModeButton viewMode={viewMode} onChange={onViewModeChange} />
        </div>
      </div>

      <div className="flex min-h-[1.75rem] flex-wrap items-center gap-3 text-sm leading-6 text-muted">
        <span>
          Showing {visibleCount} of {totalCount} blackout dates.
        </span>
        {hasFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="font-semibold text-accent transition hover:text-accent-strong"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AddBlackoutCard({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="group flex min-h-[18rem] flex-col items-start justify-between rounded-[1.9rem] border border-dashed border-border bg-card/80 p-6 text-left shadow-[0_24px_70px_-55px_rgba(34,29,24,0.35)] transition hover:border-accent hover:bg-card"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-muted transition group-hover:border-accent group-hover:text-accent">
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
        <p className="font-display text-3xl">Add blackout date</p>
        <p className="mt-3 max-w-sm text-sm leading-7 text-muted">
          Create closures, time off, or staff-specific exceptions.
        </p>
      </div>
    </button>
  );
}

function BlackoutCard({
  blackout,
  onEdit,
}: {
  blackout: BlackoutRecord;
  onEdit: (blackout: BlackoutRecord) => void;
}) {
  const timingStatus = getBlackoutTimingStatus(blackout, new Date());

  return (
    <article className="rounded-[1.9rem] border border-border bg-card/95 p-6 shadow-[0_24px_70px_-55px_rgba(34,29,24,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-3xl">{blackout.reason ?? "Blocked time"}</p>
          <p className="mt-2 text-sm text-muted">
            {blackout.staffMember?.name ?? "Entire business"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-surface px-3 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
            {timingStatus}
          </span>
          <EditIconButton
            label={`Edit ${blackout.reason ?? "blackout date"}`}
            onClick={() => onEdit(blackout)}
          />
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-muted">
        {formatBlackoutRange(blackout.startsAt, blackout.endsAt)}
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {blackout.staffMemberId ? "Staff-specific" : "Business-wide"}
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {format(blackout.startsAt, "MMM d")}
        </span>
      </div>
    </article>
  );
}

function AddBlackoutListRow({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="flex w-full flex-col gap-3 px-5 py-5 text-left transition hover:bg-surface/70"
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
          <p className="font-display text-2xl">Add blackout date</p>
          <p className="mt-1 text-sm text-muted">Create a new scheduling exception</p>
        </div>
      </div>
    </button>
  );
}

function BlackoutListRow({
  blackout,
  onEdit,
}: {
  blackout: BlackoutRecord;
  onEdit: (blackout: BlackoutRecord) => void;
}) {
  return (
    <article className="flex flex-col gap-4 px-5 py-5 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_auto] md:items-center md:gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-display text-2xl">{blackout.reason ?? "Blocked time"}</p>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
            {blackout.staffMemberId ? "Staff-specific" : "Business-wide"}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted">
          {blackout.staffMember?.name ?? "Entire business"} ·{" "}
          {formatBlackoutRange(blackout.startsAt, blackout.endsAt)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {getBlackoutTimingStatus(blackout, new Date())}
        </span>
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {format(blackout.startsAt, "MMM d")}
        </span>
      </div>

      <div className="flex justify-start md:justify-end">
        <EditIconButton
          label={`Edit ${blackout.reason ?? "blackout date"}`}
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
}: {
  hasFilters: boolean;
  onResetFilters: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-border bg-card/90 px-6 py-10 text-center">
      <h2 className="font-display text-3xl">
        {hasFilters ? "No blackout dates match these filters." : "No blackout dates yet."}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted">
        {hasFilters
          ? "Try a different search or reset the current filters to bring the full blackout list back into view."
          : "Add closures, time-off windows, or staff-specific exceptions from this workspace."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {hasFilters ? (
          <button
            type="button"
            onClick={onResetFilters}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent"
          >
            Reset filters
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCreate}
          className="brand-accent-fill rounded-full px-4 py-2 text-sm font-semibold transition"
        >
          Add blackout date
        </button>
      </div>
    </div>
  );
}

function BusinessHoursListRow({
  entry,
  onEdit,
}: {
  entry: BusinessHoursRecord;
  onEdit: (entry: BusinessHoursRecord) => void;
}) {
  return (
    <article className="flex flex-col gap-4 px-5 py-5 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_auto] md:items-center md:gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-display text-2xl">{getDayLabel(entry.dayOfWeek)}</p>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
            {entry.isClosed ? "Closed" : "Open"}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted">{formatBusinessHoursLabel(entry)}</p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span className="rounded-full border border-border bg-surface px-3 py-2">
          {entry.isClosed ? "No booking window" : "Calendar overlay active"}
        </span>
      </div>

      <div className="flex justify-start md:justify-end">
        <EditIconButton label={`Edit ${getDayLabel(entry.dayOfWeek)}`} onClick={() => onEdit(entry)} />
      </div>
    </article>
  );
}

export default function CalendarManager({
  businessHours,
  staffMembers,
  appointments,
  blackoutDates,
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

  const calendarItems = buildCalendarItems(appointments, blackoutDates, selectedStaffId);
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
  const rangeLabel = getRangeLabel(focusDate, calendarViewMode);

  const now = new Date();
  const filteredBlackoutDates = blackoutDates
    .filter((blackout) => matchesBlackoutSearch(blackout, deferredSearchQuery.trim()))
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

  function openBusinessHoursModal(entry: BusinessHoursRecord) {
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
        />

        {calendarViewMode === "month" ? (
          <MonthView
            focusDate={focusDate}
            days={visibleDays}
            items={visibleCalendarItems}
            selectedItemKey={selectedItemKey}
            workingWindowsByDay={workingWindowsByDay}
            onSelectItem={(item) => setSelectedItemKey(item.key)}
          />
        ) : (
          <TimeGridView
            days={visibleDays}
            items={visibleCalendarItems}
            selectedItemKey={selectedItemKey}
            workingWindowsByDay={workingWindowsByDay}
            onSelectItem={(item) => setSelectedItemKey(item.key)}
          />
        )}

        <div className="grid gap-4 md:grid-cols-[minmax(14rem,0.8fr)_minmax(0,1.2fr)]">
          <CalendarLegendCard />
          <PeriodSnapshotCard
            rangeLabel={rangeLabel}
            selectedStaffMember={selectedStaffMember}
            visibleAppointmentsCount={visibleAppointmentsCount}
            visibleBlackoutsCount={visibleBlackoutsCount}
            selectedItem={selectedItem}
            onEditBlackout={openEditBlackoutModal}
          />
        </div>

        <div className="grid gap-4">
          <section className="rounded-[2rem] border border-border bg-surface/95 p-6 shadow-[0_24px_70px_-55px_rgba(34,29,24,0.35)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted">
              Scheduling configuration
            </p>
            <h2 className="mt-3 font-display text-4xl">Calendar settings</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              Keep schedule rules organized below the calendar. Blackout dates and business hours live in separate configuration cards for a cleaner workspace.
            </p>
          </section>

          <section className="rounded-[2rem] border border-border bg-surface/95 p-6 shadow-[0_24px_70px_-55px_rgba(34,29,24,0.35)]">
            <div className="grid gap-5">
              <div>
                <h3 className="font-display text-3xl">Blackout dates</h3>
                <p className="mt-2 text-sm leading-7 text-muted">
                  Search, filter, edit, and create unavailable periods from the same admin pattern used across the rest of the dashboard.
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
              />

              {filteredBlackoutDates.length === 0 ? (
                <EmptyBlackoutResults
                  hasFilters={hasBlackoutFilters}
                  onResetFilters={resetBlackoutFilters}
                  onCreate={openCreateBlackoutModal}
                />
              ) : blackoutViewMode === "cards" ? (
                <CardGrid>
                  <AddBlackoutCard key="create-blackout" onCreate={openCreateBlackoutModal} />
                  {filteredBlackoutDates.map((blackout) => (
                    <BlackoutCard
                      key={blackout.id}
                      blackout={blackout}
                      onEdit={openEditBlackoutModal}
                    />
                  ))}
                </CardGrid>
              ) : (
                <ListView>
                  <AddBlackoutListRow key="create-blackout-row" onCreate={openCreateBlackoutModal} />
                  {filteredBlackoutDates.map((blackout) => (
                    <div key={blackout.id} className="border-t border-border">
                      <BlackoutListRow blackout={blackout} onEdit={openEditBlackoutModal} />
                    </div>
                  ))}
                </ListView>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-surface/95 p-6 shadow-[0_24px_70px_-55px_rgba(34,29,24,0.35)]">
            <div className="grid gap-5">
              <div>
                <h3 className="font-display text-3xl">Business hours</h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">
                  These hours drive the calendar overlay and the booking engine. Edit each day in place without leaving the scheduling workspace.
                </p>
              </div>

              <ListView>
                {businessHours.map((entry, index) => (
                  <div
                    key={entry.dayOfWeek}
                    className={index === 0 ? "" : "border-t border-border"}
                  >
                    <BusinessHoursListRow entry={entry} onEdit={openBusinessHoursModal} />
                  </div>
                ))}
              </ListView>
            </div>
          </section>
        </div>
      </section>

      <CreateEntityModal
        eyebrow={blackoutModalSeed?.mode === "edit" ? "Edit blackout date" : "Create blackout date"}
        title={
          blackoutModalSeed?.mode === "edit" ? "Adjust blackout date" : "Add a blackout date"
        }
        description="Use business-wide blackout dates for closures and optional staff-specific blackout dates for exceptions, training, or time off."
        isOpen={blackoutModalSeed !== null}
        onClose={closeBlackoutModal}
      >
        {blackoutModalSeed ? (
          <BlackoutModalForm
            key={blackoutModalKey}
            seed={blackoutModalSeed}
            staffMembers={staffMembers}
            onClose={closeBlackoutModal}
          />
        ) : null}
      </CreateEntityModal>

      <CreateEntityModal
        eyebrow="Edit business hours"
        title={
          businessHoursModalSeed ? `Update ${getDayLabel(businessHoursModalSeed.dayOfWeek)}` : "Update business hours"
        }
        description="Adjust the primary operating window for this day. Staff availability still layers on top of these business hours."
        isOpen={businessHoursModalSeed !== null}
        onClose={closeBusinessHoursModal}
      >
        {businessHoursModalSeed ? (
          <BusinessHoursModalForm
            key={`business-hours-${businessHoursModalSeed.dayOfWeek}`}
            seed={businessHoursModalSeed}
            onClose={closeBusinessHoursModal}
          />
        ) : null}
      </CreateEntityModal>
    </>
  );
}
