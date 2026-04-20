import { dayOptions } from "@/lib/admin";

export type BusinessPeriodLike = {
  openTime: string;
  closeTime: string;
};

export type BusinessPeriodRecord = BusinessPeriodLike & {
  id: string;
  dayOfWeek: number;
};

export type BusinessHoursDayStateRecord = {
  id: string;
  dayOfWeek: number;
  isClosed: boolean;
};

export type BusinessHoursDayRecord<TPeriod extends BusinessPeriodLike = BusinessPeriodRecord> = {
  id: string;
  dayOfWeek: number;
  isClosed: boolean;
  periods: TPeriod[];
};

export type BusinessPeriodValidationRow = {
  openTime?: string;
  closeTime?: string;
  messages: string[];
};

export type BusinessPeriodValidationResult<TPeriod extends BusinessPeriodLike> = {
  sortedPeriods: TPeriod[];
  rowErrors: BusinessPeriodValidationRow[];
  formError?: string;
  hasErrors: boolean;
};

export type DateWindow = {
  startAt: Date;
  endAt: Date;
};

export const MAX_BUSINESS_PERIODS_PER_DAY = 5;

export function timeStringToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return Number.NaN;
  }

  return hours * 60 + minutes;
}

export function sortBusinessPeriods<TPeriod extends BusinessPeriodLike>(periods: TPeriod[]) {
  return [...periods].sort((left, right) => {
    const leftStartMinutes = timeStringToMinutes(left.openTime);
    const rightStartMinutes = timeStringToMinutes(right.openTime);

    if (Number.isNaN(leftStartMinutes) && Number.isNaN(rightStartMinutes)) {
      return 0;
    }

    if (Number.isNaN(leftStartMinutes)) {
      return 1;
    }

    if (Number.isNaN(rightStartMinutes)) {
      return -1;
    }

    if (leftStartMinutes !== rightStartMinutes) {
      return leftStartMinutes - rightStartMinutes;
    }

    const leftEndMinutes = timeStringToMinutes(left.closeTime);
    const rightEndMinutes = timeStringToMinutes(right.closeTime);

    if (Number.isNaN(leftEndMinutes) && Number.isNaN(rightEndMinutes)) {
      return 0;
    }

    if (Number.isNaN(leftEndMinutes)) {
      return 1;
    }

    if (Number.isNaN(rightEndMinutes)) {
      return -1;
    }

    return leftEndMinutes - rightEndMinutes;
  });
}

function addRowMessage(rowErrors: BusinessPeriodValidationRow[], rowIndex: number, message: string) {
  if (!rowErrors[rowIndex].messages.includes(message)) {
    rowErrors[rowIndex].messages.push(message);
  }
}

function addFieldError(
  rowErrors: BusinessPeriodValidationRow[],
  rowIndex: number,
  field: "openTime" | "closeTime",
  message: string,
) {
  if (!rowErrors[rowIndex][field]) {
    rowErrors[rowIndex][field] = message;
  }

  addRowMessage(rowErrors, rowIndex, message);
}

export function validateBusinessPeriods<TPeriod extends BusinessPeriodLike>({
  periods,
  isClosed,
}: {
  periods: TPeriod[];
  isClosed: boolean;
}): BusinessPeriodValidationResult<TPeriod> {
  const sortedPeriods = sortBusinessPeriods(periods);
  const rowErrors: BusinessPeriodValidationRow[] = sortedPeriods.map(() => ({
    messages: [],
  }));

  let formError: string | undefined;

  if (sortedPeriods.length > MAX_BUSINESS_PERIODS_PER_DAY) {
    formError = `You can add up to ${MAX_BUSINESS_PERIODS_PER_DAY} Business periods per day.`;
  }

  if (!isClosed && sortedPeriods.length === 0) {
    formError = "Add at least 1 Business period or mark the day as closed.";
  }

  const validRanges: Array<{
    rowIndex: number;
    startMinutes: number;
    endMinutes: number;
  }> = [];

  for (const [rowIndex, period] of sortedPeriods.entries()) {
    if (!period.openTime) {
      addFieldError(rowErrors, rowIndex, "openTime", "Choose a start time.");
    }

    if (!period.closeTime) {
      addFieldError(rowErrors, rowIndex, "closeTime", "Choose an end time.");
    }

    if (!period.openTime || !period.closeTime) {
      continue;
    }

    const startMinutes = timeStringToMinutes(period.openTime);
    const endMinutes = timeStringToMinutes(period.closeTime);

    if (Number.isNaN(startMinutes)) {
      addFieldError(rowErrors, rowIndex, "openTime", "Choose a valid start time.");
    }

    if (Number.isNaN(endMinutes)) {
      addFieldError(rowErrors, rowIndex, "closeTime", "Choose a valid end time.");
    }

    if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) {
      continue;
    }

    if (endMinutes <= startMinutes) {
      addFieldError(
        rowErrors,
        rowIndex,
        "closeTime",
        "End time must be later than the start time and cannot cross midnight.",
      );
      continue;
    }

    validRanges.push({
      rowIndex,
      startMinutes,
      endMinutes,
    });
  }

  for (let index = 1; index < validRanges.length; index += 1) {
    const previousRange = validRanges[index - 1];
    const currentRange = validRanges[index];

    if (currentRange.startMinutes < previousRange.endMinutes) {
      const message = "This Business period overlaps another Business period.";
      addRowMessage(rowErrors, previousRange.rowIndex, message);
      addRowMessage(rowErrors, currentRange.rowIndex, message);

      if (!rowErrors[previousRange.rowIndex].openTime) {
        rowErrors[previousRange.rowIndex].openTime = message;
      }

      if (!rowErrors[currentRange.rowIndex].openTime) {
        rowErrors[currentRange.rowIndex].openTime = message;
      }
    }
  }

  return {
    sortedPeriods,
    rowErrors,
    formError,
    hasErrors:
      !!formError || rowErrors.some((rowError) => rowError.messages.length > 0),
  };
}

export function normalizeBusinessHoursDays<
  TPeriod extends BusinessPeriodLike & { dayOfWeek: number },
>(
  dayStates: BusinessHoursDayStateRecord[],
  periods: TPeriod[],
) {
  const dayStateByDay = new Map(dayStates.map((entry) => [entry.dayOfWeek, entry]));
  const periodsByDay = new Map<number, TPeriod[]>();

  for (const entry of sortBusinessPeriods(periods)) {
    const existingEntries = periodsByDay.get(entry.dayOfWeek) ?? [];
    existingEntries.push(entry);
    periodsByDay.set(entry.dayOfWeek, existingEntries);
  }

  return dayOptions.map((day) => {
    const state = dayStateByDay.get(day.value);
    const dayPeriods = periodsByDay.get(day.value) ?? [];

    return {
      id: state?.id ?? `business-hours-day-${day.value}`,
      dayOfWeek: day.value,
      isClosed: state?.isClosed ?? dayPeriods.length === 0,
      periods: dayPeriods,
    } satisfies BusinessHoursDayRecord<TPeriod>;
  });
}

export function getBusinessHoursDay<TPeriod extends BusinessPeriodLike>(
  hours: BusinessHoursDayRecord<TPeriod>[],
  dayOfWeek: number,
) {
  return (
    hours.find((entry) => entry.dayOfWeek === dayOfWeek) ?? {
      id: `business-hours-day-${dayOfWeek}`,
      dayOfWeek,
      isClosed: true,
      periods: [],
    }
  );
}

export function intersectDateWindows(leftWindows: DateWindow[], rightWindows: DateWindow[]) {
  const intersections: DateWindow[] = [];

  for (const leftWindow of leftWindows) {
    for (const rightWindow of rightWindows) {
      const startAt =
        leftWindow.startAt.getTime() > rightWindow.startAt.getTime()
          ? leftWindow.startAt
          : rightWindow.startAt;
      const endAt =
        leftWindow.endAt.getTime() < rightWindow.endAt.getTime()
          ? leftWindow.endAt
          : rightWindow.endAt;

      if (startAt.getTime() < endAt.getTime()) {
        intersections.push({
          startAt,
          endAt,
        });
      }
    }
  }

  return intersections.sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
}
