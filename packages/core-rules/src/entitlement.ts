import { toUtcDate, yearOf, type IsoDate } from "@urlaub/holidays";
import { countLeaveDays } from "./leave-days.js";
import { FULL_WEEK, isBlocking, type Employee, type LeaveRequest } from "./types.js";

/** Rundet einen Jahresanspruch kaufmaennisch: 0,25 ab, 0,75 auf. */
export function roundToHalfDay(value: number): number {
  const scaled = Math.abs(value) * 2;
  const rounded = Math.round(scaled + Number.EPSILON * scaled);
  return (value < 0 ? -rounded : rounded) / 2;
}

/** Volle Beschaeftigungsmonate im Eintrittsjahr. */
export function fullEmploymentMonths(hiredAt: IsoDate): number {
  const date = toUtcDate(hiredAt);
  const firstFullMonth = date.getUTCDate() === 1 ? date.getUTCMonth() : date.getUTCMonth() + 1;
  return Math.max(0, 12 - firstFullMonth);
}

/** Anspruch bei Vollbeschaeftigung ueber das ganze Jahr, vor Rundung. */
export function proRataFactor(workdayCount: number): number {
  return workdayCount / FULL_WEEK.length;
}

/**
 * Jahresanspruch eines Mitarbeiters, anteilig nach vertraglichen Arbeitstagen
 * und im Eintrittsjahr zusaetzlich nach vollen Beschaeftigungsmonaten.
 */
export function annualEntitlement(
  employee: Pick<Employee, "workdays" | "fullTimeEntitlement" | "hiredAt">,
  year: number,
): number {
  const hiredYear = yearOf(employee.hiredAt);
  if (hiredYear > year) {
    return 0;
  }

  const base = employee.fullTimeEntitlement * proRataFactor(employee.workdays.length);
  if (hiredYear < year) {
    return roundToHalfDay(base);
  }

  const months = fullEmploymentMonths(employee.hiredAt);
  return roundToHalfDay((base * months) / 12);
}

export function carryOverDeadline(year: number): IsoDate {
  return `${year}-03-31`;
}

/** Der Uebertrag ist bis einschliesslich 31.03. nutzbar. */
export function isCarryOverUsable(asOf: IsoDate, year: number): boolean {
  return asOf <= carryOverDeadline(year);
}

export interface LeaveBalance {
  year: number;
  /** Anspruch aus dem laufenden Jahr. */
  annual: number;
  /** Uebertrag aus dem Vorjahr, wie er zu Jahresbeginn zur Verfuegung stand. */
  carriedOver: number;
  /** Uebertrag, der am Stichtag noch nutzbar ist. */
  carriedOverAvailable: number;
  used: number;
  usedFromCarriedOver: number;
  usedFromAnnual: number;
  remaining: number;
}

export interface BalanceOptions {
  /** Antraege, die bei der Berechnung uebergangen werden, etwa der zu pruefende. */
  ignoreRequestIds?: readonly string[];
}

/**
 * Verbrauch und Restanspruch zu einem Stichtag. Verbraucht wird zuerst der
 * Uebertrag, danach der Anspruch des laufenden Jahres.
 */
export function computeBalance(
  employee: Employee,
  year: number,
  requests: readonly LeaveRequest[],
  asOf: IsoDate,
  options: BalanceOptions = {},
): LeaveBalance {
  const ignored = new Set(options.ignoreRequestIds ?? []);
  const annual = annualEntitlement(employee, year);

  const used = requests
    .filter(
      (request) =>
        request.employeeId === employee.id &&
        !ignored.has(request.id) &&
        isBlocking(request) &&
        yearOf(request.from) === year,
    )
    .reduce((total, request) => total + countLeaveDays(request, employee), 0);

  const usedFromCarriedOver = Math.min(used, employee.carriedOver);
  const usedFromAnnual = used - usedFromCarriedOver;
  const carriedOverLeft = employee.carriedOver - usedFromCarriedOver;
  const carriedOverAvailable = isCarryOverUsable(asOf, year) ? carriedOverLeft : 0;

  return {
    year,
    annual,
    carriedOver: employee.carriedOver,
    carriedOverAvailable,
    used,
    usedFromCarriedOver,
    usedFromAnnual,
    remaining: annual - usedFromAnnual + carriedOverAvailable,
  };
}
