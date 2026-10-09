import {
  getHolidays,
  isBundesland,
  validateLeaveRequest,
  type Bundesland,
  type Employee,
  type Holiday,
  type LeaveRequest,
} from "@urlaub/core-rules";
import type { HrStore } from "./store.js";

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getEmployee(store: HrStore, id: string): Employee {
  const { employees } = store.read();
  const employee = employees.find((candidate) => candidate.id === id);
  if (!employee) {
    const known = employees
      .slice(0, 5)
      .map((candidate) => candidate.id)
      .join(", ");
    throw new ToolError(
      `Kein Mitarbeiter mit der Id "${id}". Bekannte Ids beginnen mit: ${known}. ` +
        "Mit list_employees laesst sich die vollstaendige Liste abrufen.",
    );
  }
  return employee;
}

export function listEmployees(store: HrStore, team?: string): Employee[] {
  const { employees } = store.read();
  if (team === undefined) {
    return employees;
  }
  const matches = employees.filter((employee) => employee.team === team);
  if (matches.length === 0) {
    const teams = [...new Set(employees.map((employee) => employee.team))].join(", ");
    throw new ToolError(`Kein Team namens "${team}". Vorhandene Teams: ${teams}.`);
  }
  return matches;
}

export interface AbsenceEntry {
  employeeId: string;
  employeeName: string;
  from: string;
  to: string;
  halfDay?: "AM" | "PM";
}

export function listAbsences(
  store: HrStore,
  team: string,
  from: string,
  to: string,
): AbsenceEntry[] {
  if (from > to) {
    throw new ToolError(`Das Von-Datum "${from}" liegt nach dem Bis-Datum "${to}".`);
  }
  const { employees, absences } = store.read();
  const members = new Map(
    employees
      .filter((employee) => employee.team === team)
      .map((employee) => [employee.id, employee]),
  );
  if (members.size === 0) {
    const teams = [...new Set(employees.map((employee) => employee.team))].join(", ");
    throw new ToolError(`Kein Team namens "${team}". Vorhandene Teams: ${teams}.`);
  }

  return absences
    .filter(
      (absence) =>
        absence.status === "approved" &&
        members.has(absence.employeeId) &&
        absence.from <= to &&
        absence.to >= from,
    )
    .map((absence) => ({
      employeeId: absence.employeeId,
      employeeName: members.get(absence.employeeId)?.name ?? absence.employeeId,
      from: absence.from,
      to: absence.to,
      ...(absence.halfDay ? { halfDay: absence.halfDay } : {}),
    }))
    .toSorted((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
}

export function holidaysFor(bundesland: string, year: number): Holiday[] {
  const code = bundesland.toUpperCase();
  if (!isBundesland(code)) {
    throw new ToolError(
      `"${bundesland}" ist kein gueltiges Bundesland-Kuerzel. Erwartet wird eines von ` +
        "BW, BY, BE, BB, HB, HH, HE, MV, NI, NW, RP, SL, SN, ST, SH, TH.",
    );
  }
  if (!Number.isInteger(year) || year < 2020 || year > 2040) {
    throw new ToolError(
      `Das Jahr "${year}" liegt ausserhalb des unterstuetzten Bereichs 2020-2040.`,
    );
  }
  return getHolidays(code as Bundesland, year);
}

export interface RequestLeaveResult {
  request: LeaveRequest;
  days: number;
  warnings: string[];
}

export function requestLeave(
  store: HrStore,
  input: { employeeId: string; from: string; to: string; halfDay?: "AM" | "PM" },
  now: string = today(),
): RequestLeaveResult {
  const { employees, absences } = store.read();
  const employee = employees.find((candidate) => candidate.id === input.employeeId);
  if (!employee) {
    throw new ToolError(
      `Kein Mitarbeiter mit der Id "${input.employeeId}". Erst list_employees aufrufen.`,
    );
  }

  const span = { from: input.from, to: input.to, halfDay: input.halfDay };
  const result = validateLeaveRequest(span, {
    employee,
    employees,
    requests: absences,
    today: now,
  });

  if (!result.valid) {
    const reasons = result.errors.map((issue) => `${issue.code}: ${issue.message}`).join(" | ");
    throw new ToolError(`Der Antrag verletzt die Fachregeln. ${reasons}`);
  }

  const request: LeaveRequest = {
    id: store.nextRequestId(absences),
    employeeId: employee.id,
    from: input.from,
    to: input.to,
    ...(input.halfDay ? { halfDay: input.halfDay } : {}),
    status: "pending",
  };

  store.writeAbsences([...absences, request]);

  return {
    request,
    days: result.days,
    warnings: result.warnings.map((issue) => issue.message),
  };
}
