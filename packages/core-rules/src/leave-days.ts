import type { Employee, LeaveSpan } from "./types.js";
import { countWorkdays, listWorkdays } from "./workdays.js";

/**
 * Umfang eines Antrags in Urlaubstagen.
 */
export function countLeaveDays(
  span: LeaveSpan,
  employee: Pick<Employee, "workdays" | "bundesland">,
): number {
  return countWorkdays(span.from, span.to, employee.workdays, employee.bundesland);
}

export function listLeaveDays(
  span: LeaveSpan,
  employee: Pick<Employee, "workdays" | "bundesland">,
): string[] {
  return listWorkdays(span.from, span.to, employee.workdays, employee.bundesland);
}
