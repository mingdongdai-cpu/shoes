import type { Timestamp } from 'firebase/firestore';

export type ReportPeriod = 'day' | 'week' | 'month';

export interface TimeRange {
  start: Date;
  end: Date;
}

export function parseIsoWeek(weekValue: string): TimeRange {
  const [year, weekStr] = weekValue.split('-W');
  const y = Number.parseInt(year, 10);
  const w = Number.parseInt(weekStr, 10);
  const simple = new Date(y, 0, 1 + (w - 1) * 7);
  const dow = simple.getDay();
  const isoWeekStart = new Date(simple);
  if (dow <= 4) {
    isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }

  const start = new Date(isoWeekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getRangeByMonth(month: string): TimeRange {
  const [year, monthPart] = month.split('-');
  const y = Number.parseInt(year, 10);
  const m = Number.parseInt(monthPart, 10);
  const start = new Date(y, m - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(y, m, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getRangeByPeriod(
  period: ReportPeriod,
  selectedDate: string,
  selectedWeek: string,
  selectedMonth: string
): TimeRange {
  if (period === 'day') {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  if (period === 'week') {
    return parseIsoWeek(selectedWeek);
  }
  return getRangeByMonth(selectedMonth);
}

export function timestampToDate(value: Timestamp): Date {
  return value.toDate();
}

export function isWithinRange(value: Timestamp, range: TimeRange): boolean {
  const date = timestampToDate(value);
  return date >= range.start && date <= range.end;
}

export function formatDateInputValue(value: Timestamp): string {
  const date = timestampToDate(value);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDateTimeLabel(value: Timestamp): string {
  const date = timestampToDate(value);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  const hh = `${date.getHours()}`.padStart(2, '0');
  const mm = `${date.getMinutes()}`.padStart(2, '0');
  const ss = `${date.getSeconds()}`.padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

export function monthKeyFromTimestamp(value: Timestamp): string {
  const date = timestampToDate(value);
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
}

