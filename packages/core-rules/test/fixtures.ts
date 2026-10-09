import type { Bundesland, Employee, LeaveRequest, Weekday } from "../src/index.js";

export const PATTERNS: readonly [string, Weekday[]][] = [
  ["Vollzeit", ["MO", "TU", "WE", "TH", "FR"]],
  ["4-Tage", ["MO", "TU", "WE", "TH"]],
  ["3-Tage", ["MO", "WE", "FR"]],
  ["2-Tage", ["TU", "TH"]],
];

export function employee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "emp-test",
    name: "Test Person",
    team: "Test",
    bundesland: "NW",
    workdays: ["MO", "TU", "WE", "TH", "FR"],
    fullTimeEntitlement: 30,
    hiredAt: "2015-01-01",
    carriedOver: 0,
    ...overrides,
  };
}

export function request(overrides: Partial<LeaveRequest> = {}): LeaveRequest {
  return {
    id: "req-test",
    employeeId: "emp-test",
    from: "2026-06-01",
    to: "2026-06-05",
    status: "approved",
    ...overrides,
  };
}

export const ALL_BUNDESLAENDER: readonly Bundesland[] = [
  "BW",
  "BY",
  "BE",
  "BB",
  "HB",
  "HH",
  "HE",
  "MV",
  "NI",
  "NW",
  "RP",
  "SL",
  "SN",
  "ST",
  "SH",
  "TH",
];
