import {
  computeBalance,
  countLeaveDays,
  HALF_DAY_VALUE,
  isHalfDaySpan,
  validateLeaveRequest,
  type LeaveRequest,
  type ValidationCode,
  type Weekday,
} from "../src/index.js";
import { employee, request } from "./fixtures.js";

const TODAY = "2026-06-15";

/** Bremen hat im Juni keinen Feiertag, Nordrhein-Westfalen am 04.06. Fronleichnam. */
const MONDAY = "2026-06-22";
const TUESDAY = "2026-06-23";
const SATURDAY = "2026-06-20";
const CORPUS_CHRISTI = "2026-06-04";

function codesOf(from: string, to: string, halfDay: "AM" | "PM" | undefined, workdays: Weekday[]) {
  const person = employee({ id: "emp-a", bundesland: "HB", workdays });
  return validateLeaveRequest(
    { from, to, halfDay },
    { employee: person, employees: [person], requests: [], today: TODAY },
  ).errors.map((issue) => issue.code as ValidationCode);
}

describe("Regel 9: ein halber Tag zaehlt 0,5 Urlaubstage", () => {
  test("der Wert ist ein halber Tag", () => {
    expect(HALF_DAY_VALUE).toBe(0.5);
  });

  const SPANS: ReadonlyArray<[string, string, string, "AM" | "PM" | undefined, boolean]> = [
    ["eintaegig vormittags", MONDAY, MONDAY, "AM", true],
    ["eintaegig nachmittags", MONDAY, MONDAY, "PM", true],
    ["eintaegig ohne Angabe", MONDAY, MONDAY, undefined, false],
    ["zweitaegig vormittags", MONDAY, TUESDAY, "AM", false],
  ];

  test.each(SPANS)("%s gilt als Halbtag: %s", (_name, from, to, halfDay, expected) => {
    expect(isHalfDaySpan({ from, to, halfDay })).toBe(expected);
  });

  const COUNTS: ReadonlyArray<[string, Weekday[], string, "AM" | "PM" | undefined, number]> = [
    ["Vollzeit, halber Montag", ["MO", "TU", "WE", "TH", "FR"], MONDAY, "AM", 0.5],
    ["Vollzeit, ganzer Montag", ["MO", "TU", "WE", "TH", "FR"], MONDAY, undefined, 1],
    ["Vollzeit, halber Samstag", ["MO", "TU", "WE", "TH", "FR"], SATURDAY, "PM", 0],
    ["Teilzeit MO/MI/FR, halber Montag", ["MO", "WE", "FR"], MONDAY, "AM", 0.5],
    ["Teilzeit MO/MI/FR, halber Dienstag", ["MO", "WE", "FR"], TUESDAY, "AM", 0],
    ["Teilzeit DI/DO, halber Dienstag", ["TU", "TH"], TUESDAY, "PM", 0.5],
    ["Teilzeit DI/DO, halber Montag", ["TU", "TH"], MONDAY, "PM", 0],
  ];

  test.each(COUNTS)("%s ergibt %s Tage", (_name, workdays, day, halfDay, expected) => {
    const person = employee({ bundesland: "HB", workdays });
    expect(countLeaveDays({ from: day, to: day, halfDay }, person)).toBe(expected);
  });

  test("ein halber Tag auf einem Feiertag zaehlt nicht", () => {
    const person = employee({ bundesland: "NW", workdays: ["MO", "TU", "WE", "TH", "FR"] });
    expect(
      countLeaveDays({ from: CORPUS_CHRISTI, to: CORPUS_CHRISTI, halfDay: "AM" }, person),
    ).toBe(0);
  });

  test("ausserhalb des Bundeslandes ist derselbe Tag ein halber Urlaubstag", () => {
    const person = employee({ bundesland: "HB", workdays: ["MO", "TU", "WE", "TH", "FR"] });
    expect(
      countLeaveDays({ from: CORPUS_CHRISTI, to: CORPUS_CHRISTI, halfDay: "AM" }, person),
    ).toBe(0.5);
  });
});

describe("Regel 9: Halbtage nur bei eintaegigen Antraegen", () => {
  test("ein Halbtag ueber zwei Tage wird abgelehnt", () => {
    expect(codesOf(MONDAY, TUESDAY, "AM", ["MO", "TU", "WE", "TH", "FR"])).toContain(
      "HALF_DAY_NOT_SINGLE_DAY",
    );
  });

  test("ein Halbtag an einem einzelnen Arbeitstag ist gueltig", () => {
    expect(codesOf(MONDAY, MONDAY, "PM", ["MO", "TU", "WE", "TH", "FR"])).toEqual([]);
  });

  test("ein Halbtag an einem vertragsfreien Tag hat keinen Arbeitstag", () => {
    expect(codesOf(TUESDAY, TUESDAY, "AM", ["MO", "WE", "FR"])).toContain("NO_WORKDAYS");
  });

  test("ohne halfDay bleibt ein mehrtaegiger Antrag zulaessig", () => {
    expect(codesOf(MONDAY, TUESDAY, undefined, ["MO", "TU", "WE", "TH", "FR"])).toEqual([]);
  });
});

describe("Regel 9 im Urlaubskonto", () => {
  test("halbe Tage werden halb verbucht", () => {
    const person = employee({ id: "emp-a", bundesland: "HB", workdays: ["MO", "WE", "FR"] });
    const requests: LeaveRequest[] = [
      request({ id: "req-1", employeeId: "emp-a", from: MONDAY, to: MONDAY, halfDay: "AM" }),
      request({ id: "req-2", employeeId: "emp-a", from: "2026-06-24", to: "2026-06-24" }),
    ];

    const balance = computeBalance(person, 2026, requests, TODAY);
    expect(balance.used).toBe(1.5);
    expect(balance.remaining).toBe(balance.annual - 1.5);
  });

  test("ein halber Tag kann den letzten halben Resttag aufbrauchen", () => {
    const person = employee({
      id: "emp-a",
      bundesland: "HB",
      workdays: ["MO", "TU", "WE", "TH", "FR"],
      fullTimeEntitlement: 1,
    });
    const booked: LeaveRequest = request({
      id: "req-1",
      employeeId: "emp-a",
      from: "2026-06-24",
      to: "2026-06-24",
      halfDay: "AM",
    });

    const result = validateLeaveRequest(
      { from: MONDAY, to: MONDAY, halfDay: "PM" },
      { employee: person, employees: [person], requests: [booked], today: TODAY },
    );

    expect(result.days).toBe(0.5);
    expect(result.valid).toBe(true);
  });

  test("ein halber Tag zu viel wird abgelehnt", () => {
    const person = employee({
      id: "emp-a",
      bundesland: "HB",
      workdays: ["MO", "TU", "WE", "TH", "FR"],
      fullTimeEntitlement: 1,
    });
    const booked: LeaveRequest = request({
      id: "req-1",
      employeeId: "emp-a",
      from: "2026-06-24",
      to: "2026-06-25",
    });

    const result = validateLeaveRequest(
      { from: MONDAY, to: MONDAY, halfDay: "PM" },
      { employee: person, employees: [person], requests: [booked], today: TODAY },
    );

    expect(result.errors.map((issue) => issue.code)).toContain("INSUFFICIENT_ENTITLEMENT");
  });
});
