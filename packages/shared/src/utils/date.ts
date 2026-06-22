import { format, isToday, isTomorrow } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { MALAYSIA_TIMEZONE } from "../constants/queue";

export function toMYT(date: Date | string): Date {
  return toZonedTime(new Date(date), MALAYSIA_TIMEZONE);
}

export function fromMYT(date: Date): Date {
  return fromZonedTime(date, MALAYSIA_TIMEZONE);
}

export function formatMYTDate(date: Date | string, fmt = "dd MMM yyyy"): string {
  return format(toMYT(date), fmt);
}

export function formatMYTTime(date: Date | string, fmt = "hh:mm a"): string {
  return format(toMYT(date), fmt);
}

export function getMYTToday(): string {
  return format(toMYT(new Date()), "yyyy-MM-dd");
}

export function estimateWaitMinutes(
  peopleAhead: number,
  consultationDurationMinutes: number
): number {
  return peopleAhead * consultationDurationMinutes;
}

export function formatWaitTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

export function getRelativeDayLabel(dateStr: string): string {
  const date = toMYT(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE, dd MMM");
}
