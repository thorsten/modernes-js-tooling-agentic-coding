import { eachIsoDay, isHoliday, toUtcDate, type Bundesland, type IsoDate } from "@urlaub/holidays";
import type { Weekday } from "./types.js";

const BY_UTC_DAY: readonly Weekday[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

export function weekdayOf(date: IsoDate): Weekday {
  return BY_UTC_DAY[toUtcDate(date).getUTCDay()];
}

/**
 * Ein Tag zaehlt, wenn er ein vertraglicher Arbeitstag ist und im Bundesland
 * des Mitarbeiters kein Feiertag. Wochenenden fallen ueber die vertraglichen
 * Arbeitstage heraus, nicht ueber eine eigene Regel.
 */
export function isWorkday(
  date: IsoDate,
  workdays: readonly Weekday[],
  bundesland: Bundesland,
): boolean {
  if (!workdays.includes(weekdayOf(date))) {
    return false;
  }
  return !isHoliday(date, bundesland);
}

export function countWorkdays(
  from: IsoDate,
  to: IsoDate,
  workdays: readonly Weekday[],
  bundesland: Bundesland,
): number {
  let count = 0;
  for (const day of eachIsoDay(from, to)) {
    if (isWorkday(day, workdays, bundesland)) {
      count += 1;
    }
  }
  return count;
}

export function listWorkdays(
  from: IsoDate,
  to: IsoDate,
  workdays: readonly Weekday[],
  bundesland: Bundesland,
): IsoDate[] {
  return eachIsoDay(from, to).filter((day) => isWorkday(day, workdays, bundesland));
}
