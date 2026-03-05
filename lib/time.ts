import dayjs from "dayjs";

export function todayDate(): string {
  return dayjs().format("YYYY-MM-DD");
}

export function addDays(date: string, days: number): string {
  return dayjs(date).add(days, "day").format("YYYY-MM-DD");
}

export function daysInRange(startDate: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(startDate, index));
}

export function dateMinus(date: string, days: number): string {
  return dayjs(date).subtract(days, "day").format("YYYY-MM-DD");
}
