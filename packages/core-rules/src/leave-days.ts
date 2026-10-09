import type { Employee, LeaveSpan } from "./types.js";
import { countWorkdays, isWorkday, listWorkdays } from "./workdays.js";

/** Ein halber Tag zaehlt einen halben Urlaubstag. */
export const HALF_DAY_VALUE = 0.5;

/**
 * Ein halber Tag ist nur bei einem eintaegigen Antrag zulaessig. Massstab ist
 * der vertragliche Arbeitstag des Mitarbeiters, nicht der Kalendertag: Wer
 * dienstags nicht arbeitet, kann dienstags auch keinen halben Tag nehmen.
 */
export function isHalfDaySpan(span: LeaveSpan): boolean {
  return span.halfDay !== undefined && span.from === span.to;
}

/**
 * Umfang eines Antrags in Urlaubstagen.
 */
export function countLeaveDays(
  span: LeaveSpan,
  employee: Pick<Employee, "workdays" | "bundesland">,
): number {
  if (isHalfDaySpan(span)) {
    return isWorkday(span.from, employee.workdays, employee.bundesland) ? HALF_DAY_VALUE : 0;
  }
  return countWorkdays(span.from, span.to, employee.workdays, employee.bundesland);
}

export function listLeaveDays(
  span: LeaveSpan,
  employee: Pick<Employee, "workdays" | "bundesland">,
): string[] {
  return listWorkdays(span.from, span.to, employee.workdays, employee.bundesland);
}
