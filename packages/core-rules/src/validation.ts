import { addIsoDays, isIsoDate, yearOf, type IsoDate } from "@urlaub/holidays";
import { computeBalance } from "./entitlement.js";
import { countLeaveDays, isHalfDaySpan } from "./leave-days.js";
import { findTeamCoverageConflicts } from "./team.js";
import { LeaveRuleError, type Employee, type LeaveRequest, type LeaveSpan } from "./types.js";

/** Wie weit ein Antrag rueckwirkend gestellt werden darf. */
export const MAX_BACKDATING_DAYS = 14;

export type ValidationCode =
  | "INVALID_DATE"
  | "INVALID_RANGE"
  | "UNKNOWN_EMPLOYEE"
  | "REQUEST_TOO_FAR_IN_PAST"
  | "SPANS_YEAR_BOUNDARY"
  | "HALF_DAY_NOT_SINGLE_DAY"
  | "NO_WORKDAYS"
  | "INSUFFICIENT_ENTITLEMENT"
  | "TEAM_COVERAGE";

export interface ValidationIssue {
  code: ValidationCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  days: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationContext {
  employee: Employee;
  employees: readonly Employee[];
  requests: readonly LeaveRequest[];
  today: IsoDate;
  /** Antraege, die beim Deckungsvergleich uebergangen werden. */
  ignoreRequestIds?: readonly string[];
}

function invalid(errors: ValidationIssue[]): ValidationResult {
  return { valid: false, days: 0, errors, warnings: [] };
}

/**
 * Prueft einen Antrag gegen die Fachregeln. Fehler verhindern den Antrag,
 * Warnungen nicht.
 */
export function validateLeaveRequest(
  span: LeaveSpan,
  context: ValidationContext,
): ValidationResult {
  const { employee, employees, requests, today } = context;

  if (!isIsoDate(span.from) || !isIsoDate(span.to)) {
    return invalid([
      {
        code: "INVALID_DATE",
        message: "Von- und Bis-Datum muessen im Format YYYY-MM-DD vorliegen.",
        details: { from: span.from, to: span.to },
      },
    ]);
  }

  if (span.from > span.to) {
    return invalid([
      {
        code: "INVALID_RANGE",
        message: "Das Von-Datum darf nicht nach dem Bis-Datum liegen.",
        details: { from: span.from, to: span.to },
      },
    ]);
  }

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const year = yearOf(span.from);
  if (yearOf(span.to) !== year) {
    errors.push({
      code: "SPANS_YEAR_BOUNDARY",
      message: "Ein Antrag darf den Jahreswechsel nicht ueberschreiten und muss geteilt werden.",
      details: { from: span.from, to: span.to },
    });
  }

  const earliest = addIsoDays(today, -MAX_BACKDATING_DAYS);
  if (span.from < earliest) {
    errors.push({
      code: "REQUEST_TOO_FAR_IN_PAST",
      message: `Ein Antrag darf hoechstens ${MAX_BACKDATING_DAYS} Tage rueckwirkend beginnen.`,
      details: { from: span.from, earliest },
    });
  }

  if (span.halfDay !== undefined && !isHalfDaySpan(span)) {
    errors.push({
      code: "HALF_DAY_NOT_SINGLE_DAY",
      message: "Ein halber Tag ist nur bei einem eintaegigen Antrag moeglich.",
      details: { from: span.from, to: span.to, halfDay: span.halfDay },
    });
  }

  const days = countLeaveDays(span, employee);
  if (days === 0) {
    errors.push({
      code: "NO_WORKDAYS",
      message: "Der Zeitraum enthaelt keinen Arbeitstag des Mitarbeiters.",
      details: { from: span.from, to: span.to, workdays: employee.workdays },
    });
  }

  if (errors.length === 0) {
    const balance = computeBalance(employee, year, requests, span.from, {
      ignoreRequestIds: context.ignoreRequestIds,
    });
    if (days > balance.remaining) {
      errors.push({
        code: "INSUFFICIENT_ENTITLEMENT",
        message: "Der Antrag uebersteigt den verfuegbaren Anspruch.",
        details: { requested: days, remaining: balance.remaining },
      });
    }

    for (const conflict of findTeamCoverageConflicts(span, employee, employees, requests, {
      ignoreRequestIds: context.ignoreRequestIds,
    })) {
      warnings.push({
        code: "TEAM_COVERAGE",
        message: `Am ${conflict.date} waeren ${conflict.absent} von ${conflict.teamSize} Personen im Team ${conflict.team} abwesend.`,
        details: { ...conflict },
      });
    }
  }

  return { valid: errors.length === 0, days, errors, warnings };
}

/** Storno ist moeglich, solange der Antrag in der Zukunft beginnt. */
export function canCancel(request: LeaveRequest, today: IsoDate): boolean {
  if (request.status !== "pending" && request.status !== "approved") {
    return false;
  }
  return request.from > today;
}

export function cancelLeaveRequest(request: LeaveRequest, today: IsoDate): LeaveRequest {
  if (!canCancel(request, today)) {
    throw new LeaveRuleError(
      "CANCEL_NOT_ALLOWED",
      "Ein Antrag kann nur storniert werden, solange er in der Zukunft beginnt.",
    );
  }
  return { ...request, status: "cancelled" };
}
