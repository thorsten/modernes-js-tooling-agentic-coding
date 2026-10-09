import type { Bundesland, IsoDate } from "@urlaub/holidays";

export type { Bundesland, IsoDate };

export type Weekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

export const WEEKDAYS: readonly Weekday[] = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

/** Vertragliche Vollzeitwoche, dient als Bezugsgroesse fuer den Anspruch. */
export const FULL_WEEK: readonly Weekday[] = ["MO", "TU", "WE", "TH", "FR"] as const;

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface Employee {
  id: string;
  name: string;
  team: string;
  bundesland: Bundesland;
  workdays: Weekday[];
  fullTimeEntitlement: number;
  hiredAt: IsoDate;
  carriedOver: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  from: IsoDate;
  to: IsoDate;
  halfDay?: "AM" | "PM";
  status: LeaveStatus;
}

/** Ein Antrag, bevor er eine Id und einen Status bekommen hat. */
export type LeaveRequestDraft = Omit<LeaveRequest, "id" | "status"> & {
  id?: string;
  status?: LeaveStatus;
};

/** Der Zeitraum eines Antrags, losgeloest von Id und Status. */
export interface LeaveSpan {
  from: IsoDate;
  to: IsoDate;
  halfDay?: "AM" | "PM";
}

/** Status, die Anspruch binden. */
export const BLOCKING_STATUSES: readonly LeaveStatus[] = ["pending", "approved"] as const;

export function isBlocking(request: LeaveRequest): boolean {
  return BLOCKING_STATUSES.includes(request.status);
}

export class LeaveRuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "LeaveRuleError";
    this.code = code;
  }
}
