import { addIsoDays } from "@urlaub/holidays";
import {
  canCancel,
  cancelLeaveRequest,
  LeaveRuleError,
  MAX_BACKDATING_DAYS,
  validateLeaveRequest,
  type LeaveRequest,
  type LeaveStatus,
  type ValidationCode,
  type ValidationContext,
  type ValidationResult,
} from "../src/index.js";
import { employee, request } from "./fixtures.js";

/** Fester Bezugstag, damit die Tests nicht mit der Systemuhr wandern. */
const TODAY = "2026-06-15";

/** Bremen hat im Juni keinen Feiertag, das haelt die Erwartungswerte einfach. */
const APPLICANT = employee({ id: "emp-a", bundesland: "HB" });

function context(overrides: Partial<ValidationContext> = {}): ValidationContext {
  return {
    employee: APPLICANT,
    employees: [APPLICANT],
    requests: [],
    today: TODAY,
    ...overrides,
  };
}

function codesOf(result: ValidationResult): ValidationCode[] {
  return result.errors.map((issue) => issue.code);
}

describe("Formale Pruefung des Zeitraums", () => {
  const MALFORMED: readonly [string, string, string][] = [
    ["Von-Datum leer", "", "2026-06-19"],
    ["Bis-Datum leer", "2026-06-15", ""],
    ["Von-Datum mit Punkten", "15.06.2026", "2026-06-19"],
    ["Bis-Datum kalendarisch unmoeglich", "2026-06-15", "2026-02-30"],
  ];

  test.each(MALFORMED)("%s wird abgelehnt", (_name, from, to) => {
    expect(codesOf(validateLeaveRequest({ from, to }, context()))).toEqual(["INVALID_DATE"]);
  });

  test("Von nach Bis wird abgelehnt", () => {
    const result = validateLeaveRequest({ from: "2026-06-19", to: "2026-06-15" }, context());
    expect(codesOf(result)).toEqual(["INVALID_RANGE"]);
  });

  test("ein einzelner Tag ist ein gueltiger Zeitraum", () => {
    const result = validateLeaveRequest({ from: "2026-06-16", to: "2026-06-16" }, context());
    expect(result.valid).toBe(true);
    expect(result.days).toBe(1);
  });
});

describe("Regel 6a: Antraege duerfen nicht beliebig rueckwirkend sein", () => {
  const OFFSETS: readonly [number, boolean][] = [
    [-20, false],
    [-15, false],
    [-MAX_BACKDATING_DAYS, true],
    [-7, true],
    [0, true],
    [14, true],
  ];

  test.each(OFFSETS)("Start %i Tage relativ zu heute ist erlaubt: %s", (offset, allowed) => {
    const from = addIsoDays(TODAY, offset);
    const result = validateLeaveRequest({ from, to: from }, context());
    expect(codesOf(result).includes("REQUEST_TOO_FAR_IN_PAST")).toBe(!allowed);
  });
});

describe("Regel 6b: kein Antrag ueber den Jahreswechsel", () => {
  test("Silvester bis Neujahr wird abgelehnt", () => {
    const result = validateLeaveRequest({ from: "2026-12-28", to: "2027-01-04" }, context());
    expect(codesOf(result)).toContain("SPANS_YEAR_BOUNDARY");
  });

  test("der gleiche Zeitraum geteilt ist gueltig", () => {
    const first = validateLeaveRequest({ from: "2026-12-28", to: "2026-12-31" }, context());
    const second = validateLeaveRequest({ from: "2027-01-01", to: "2027-01-04" }, context());
    expect(codesOf(first)).toEqual([]);
    expect(codesOf(second)).toEqual([]);
  });
});

describe("Zeitraeume ohne Arbeitstag", () => {
  const EMPTY_SPANS: readonly [string, string, string][] = [
    ["Wochenende bei Vollzeit", "2026-06-20", "2026-06-21"],
    ["Montag und Dienstag bei einer Mittwoch-Woche", "2026-06-22", "2026-06-23"],
    ["einzelner Feiertag", "2026-10-03", "2026-10-03"],
  ];

  test.each(EMPTY_SPANS)("%s ergibt keinen Urlaubstag", (name, from, to) => {
    const person =
      name === "Montag und Dienstag bei einer Mittwoch-Woche"
        ? employee({ id: "emp-a", bundesland: "HB", workdays: ["WE"] })
        : APPLICANT;
    const result = validateLeaveRequest({ from, to }, context({ employee: person }));
    expect(codesOf(result)).toContain("NO_WORKDAYS");
    expect(result.days).toBe(0);
  });
});

describe("Regel 7: der Antrag muss durch den Anspruch gedeckt sein", () => {
  const CASES: readonly [string, number, string, string, boolean][] = [
    ["knapp gedeckt", 5, "2026-06-22", "2026-06-26", true],
    ["exakt aufgebraucht", 5, "2026-06-22", "2026-06-26", true],
    ["ein Tag zu viel", 4, "2026-06-22", "2026-06-26", false],
    ["deutlich zu viel", 1, "2026-06-22", "2026-07-03", false],
  ];

  test.each(CASES)("%s", (_name, entitlement, from, to, valid) => {
    const person = employee({
      id: "emp-a",
      bundesland: "HB",
      fullTimeEntitlement: entitlement,
    });
    const result = validateLeaveRequest(
      { from, to },
      context({ employee: person, employees: [person] }),
    );
    expect(result.valid).toBe(valid);
    if (!valid) {
      expect(codesOf(result)).toContain("INSUFFICIENT_ENTITLEMENT");
    }
  });

  test("bereits gebuchte Antraege senken den verfuegbaren Anspruch", () => {
    const person = employee({ id: "emp-a", bundesland: "HB", fullTimeEntitlement: 10 });
    const booked: LeaveRequest = request({
      id: "req-1",
      employeeId: "emp-a",
      from: "2026-06-01",
      to: "2026-06-05",
      status: "approved",
    });
    const result = validateLeaveRequest(
      { from: "2026-06-22", to: "2026-07-03" },
      context({ employee: person, employees: [person], requests: [booked] }),
    );
    expect(codesOf(result)).toContain("INSUFFICIENT_ENTITLEMENT");
  });

  test("ein ignorierter Antrag bindet keinen Anspruch", () => {
    const person = employee({ id: "emp-a", bundesland: "HB", fullTimeEntitlement: 10 });
    const booked: LeaveRequest = request({
      id: "req-1",
      employeeId: "emp-a",
      from: "2026-06-01",
      to: "2026-06-05",
      status: "approved",
    });
    const result = validateLeaveRequest(
      { from: "2026-06-22", to: "2026-07-03" },
      context({
        employee: person,
        employees: [person],
        requests: [booked],
        ignoreRequestIds: ["req-1"],
      }),
    );
    expect(result.valid).toBe(true);
  });

  test("abgelehnte und stornierte Antraege binden keinen Anspruch", () => {
    const person = employee({ id: "emp-a", bundesland: "HB", fullTimeEntitlement: 10 });
    const requests: LeaveRequest[] = [
      request({
        id: "req-1",
        employeeId: "emp-a",
        from: "2026-06-01",
        to: "2026-06-05",
        status: "rejected",
      }),
      request({
        id: "req-2",
        employeeId: "emp-a",
        from: "2026-06-08",
        to: "2026-06-12",
        status: "cancelled",
      }),
    ];
    const result = validateLeaveRequest(
      { from: "2026-06-22", to: "2026-07-03" },
      context({ employee: person, employees: [person], requests }),
    );
    expect(result.valid).toBe(true);
  });
});

describe("Regel 8: Storno nur vor Antritt", () => {
  const STATUS_CASES: readonly [LeaveStatus, string, boolean][] = [
    ["pending", "2026-07-01", true],
    ["approved", "2026-07-01", true],
    ["rejected", "2026-07-01", false],
    ["cancelled", "2026-07-01", false],
    ["pending", "2026-06-15", false],
    ["approved", "2026-06-01", false],
  ];

  test.each(STATUS_CASES)("Status %s ab %s stornierbar: %s", (status, from, expected) => {
    expect(canCancel(request({ from, to: from, status }), TODAY)).toBe(expected);
  });

  test("cancelLeaveRequest setzt den Status", () => {
    const cancelled = cancelLeaveRequest(request({ from: "2026-07-01", to: "2026-07-03" }), TODAY);
    expect(cancelled.status).toBe("cancelled");
  });

  test("cancelLeaveRequest wirft fuer einen bereits begonnenen Antrag", () => {
    expect(() =>
      cancelLeaveRequest(request({ from: "2026-06-01", to: "2026-06-05" }), TODAY),
    ).toThrow(LeaveRuleError);
  });
});
