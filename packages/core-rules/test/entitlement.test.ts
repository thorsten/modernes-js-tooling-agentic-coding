import {
  annualEntitlement,
  computeBalance,
  fullEmploymentMonths,
  isCarryOverUsable,
  roundToHalfDay,
  type Weekday,
} from "../src/index.js";
import { employee, request } from "./fixtures.js";

const YEAR = 2026;
const WEEK: readonly Weekday[] = ["MO", "TU", "WE", "TH", "FR"];

describe("roundToHalfDay", () => {
  const CASES: readonly [number, number][] = [
    [0, 0],
    [12, 12],
    [12.2, 12],
    [12.24, 12],
    [12.25, 12.5],
    [12.26, 12.5],
    [12.5, 12.5],
    [12.74, 12.5],
    [12.75, 13],
    [12.76, 13],
    [17.5, 17.5],
    [-3.25, -3.5],
  ];

  test.each(CASES)("rundet %s auf %s", (value, expected) => {
    expect(roundToHalfDay(value)).toBe(expected);
  });
});

describe("fullEmploymentMonths", () => {
  const CASES: readonly [string, number][] = [
    ["2026-01-01", 12],
    ["2026-01-02", 11],
    ["2026-01-31", 11],
    ["2026-02-01", 11],
    ["2026-06-01", 7],
    ["2026-06-02", 6],
    ["2026-11-01", 2],
    ["2026-12-01", 1],
    ["2026-12-02", 0],
    ["2026-12-31", 0],
  ];

  test.each(CASES)("Eintritt am %s ergibt %i volle Monate", (hiredAt, expected) => {
    expect(fullEmploymentMonths(hiredAt)).toBe(expected);
  });
});

/**
 * Eintrittsmonate 1 bis 12 mal Arbeitstage 1 bis 5. Der Erwartungswert wird
 * in der Testdatei unabhaengig nachgerechnet.
 */
const ENTRY_MATRIX: readonly [number, number][] = Array.from({ length: 12 }, (_month, m) =>
  Array.from({ length: 5 }, (_day, d) => [m + 1, d + 1] as [number, number]),
).flat();

describe("annualEntitlement im Eintrittsjahr", () => {
  test.each(ENTRY_MATRIX)("Eintritt im Monat %i mit %i Arbeitstagen", (month, workdayCount) => {
    const hiredAt = `${YEAR}-${String(month).padStart(2, "0")}-01`;
    const person = employee({
      hiredAt,
      workdays: WEEK.slice(0, workdayCount),
      fullTimeEntitlement: 30,
    });

    const base = (30 * workdayCount) / 5;
    const months = 13 - month;
    const expected = Math.round((base * months) / 12 / 0.5) * 0.5;

    expect(annualEntitlement(person, YEAR)).toBe(expected);
  });
});

describe("annualEntitlement ausserhalb des Eintrittsjahres", () => {
  const CASES: readonly [number, number, number][] = [
    [5, 30, 30],
    [4, 30, 24],
    [3, 30, 18],
    [2, 30, 12],
    [1, 30, 6],
    [3, 28, 17],
    [3, 26, 15.5],
    [4, 26, 21],
    [2, 25, 10],
    [1, 27, 5.5],
  ];

  test.each(CASES)(
    "%i Arbeitstage bei %i Tagen Vollzeitanspruch ergeben %s Tage",
    (workdayCount, fullTime, expected) => {
      const person = employee({
        hiredAt: "2015-01-01",
        workdays: WEEK.slice(0, workdayCount),
        fullTimeEntitlement: fullTime,
      });
      expect(annualEntitlement(person, YEAR)).toBe(expected);
    },
  );

  test("ist null, wenn der Eintritt nach dem Bezugsjahr liegt", () => {
    expect(annualEntitlement(employee({ hiredAt: "2027-01-01" }), YEAR)).toBe(0);
  });
});

describe("Uebertrag aus dem Vorjahr", () => {
  const DEADLINE_CASES: readonly [string, boolean][] = [
    ["2026-01-01", true],
    ["2026-03-30", true],
    ["2026-03-31", true],
    ["2026-04-01", false],
    ["2026-04-02", false],
    ["2026-12-31", false],
  ];

  test.each(DEADLINE_CASES)("am %s nutzbar: %s", (asOf, expected) => {
    expect(isCarryOverUsable(asOf, YEAR)).toBe(expected);
  });

  test("steht vor dem Stichtag zusaetzlich zum Jahresanspruch bereit", () => {
    const person = employee({ carriedOver: 5 });
    const balance = computeBalance(person, YEAR, [], "2026-03-31");
    expect(balance.annual).toBe(30);
    expect(balance.carriedOverAvailable).toBe(5);
    expect(balance.remaining).toBe(35);
  });

  test("verfaellt nach dem 31.03. vollstaendig", () => {
    const person = employee({ carriedOver: 5 });
    const balance = computeBalance(person, YEAR, [], "2026-04-01");
    expect(balance.carriedOver).toBe(5);
    expect(balance.carriedOverAvailable).toBe(0);
    expect(balance.remaining).toBe(30);
  });

  test("wird vor dem Jahresanspruch verbraucht", () => {
    const person = employee({ carriedOver: 5 });
    const requests = [request({ id: "r1", from: "2026-02-02", to: "2026-02-04" })];
    const balance = computeBalance(person, YEAR, requests, "2026-02-10");

    expect(balance.used).toBe(3);
    expect(balance.usedFromCarriedOver).toBe(3);
    expect(balance.usedFromAnnual).toBe(0);
    expect(balance.carriedOverAvailable).toBe(2);
    expect(balance.remaining).toBe(32);
  });

  test("laeuft in den Jahresanspruch ueber, sobald der Uebertrag aufgebraucht ist", () => {
    const person = employee({ carriedOver: 2 });
    const requests = [request({ id: "r1", from: "2026-02-02", to: "2026-02-06" })];
    const balance = computeBalance(person, YEAR, requests, "2026-02-10");

    expect(balance.used).toBe(5);
    expect(balance.usedFromCarriedOver).toBe(2);
    expect(balance.usedFromAnnual).toBe(3);
    expect(balance.remaining).toBe(27);
  });

  test("der nach dem Stichtag verbleibende Uebertrag zaehlt nicht mehr mit", () => {
    const person = employee({ carriedOver: 5 });
    const requests = [request({ id: "r1", from: "2026-02-02", to: "2026-02-04" })];
    const balance = computeBalance(person, YEAR, requests, "2026-04-01");

    expect(balance.usedFromCarriedOver).toBe(3);
    expect(balance.carriedOverAvailable).toBe(0);
    expect(balance.remaining).toBe(30);
  });
});

describe("computeBalance", () => {
  test("zaehlt offene und genehmigte Antraege, aber keine stornierten oder abgelehnten", () => {
    const person = employee();
    const requests = [
      request({ id: "r1", from: "2026-06-01", to: "2026-06-05", status: "approved" }),
      request({ id: "r2", from: "2026-07-06", to: "2026-07-10", status: "pending" }),
      request({ id: "r3", from: "2026-08-03", to: "2026-08-07", status: "cancelled" }),
      request({ id: "r4", from: "2026-09-07", to: "2026-09-11", status: "rejected" }),
    ];

    // Der 4. Juni 2026 ist in Nordrhein-Westfalen Fronleichnam und faellt heraus.
    expect(computeBalance(person, YEAR, requests, "2026-05-01").used).toBe(9);
  });

  test("uebergeht Antraege anderer Mitarbeiter", () => {
    const person = employee();
    const requests = [request({ id: "r1", employeeId: "emp-other" })];
    expect(computeBalance(person, YEAR, requests, "2026-05-01").used).toBe(0);
  });

  test("uebergeht Antraege aus anderen Jahren", () => {
    const person = employee();
    const requests = [request({ id: "r1", from: "2025-06-02", to: "2025-06-06" })];
    expect(computeBalance(person, YEAR, requests, "2026-05-01").used).toBe(0);
  });

  test("laesst sich einzelne Antraege ausblenden", () => {
    const person = employee();
    const requests = [request({ id: "r1", from: "2026-06-01", to: "2026-06-05" })];
    const balance = computeBalance(person, YEAR, requests, "2026-05-01", {
      ignoreRequestIds: ["r1"],
    });
    expect(balance.used).toBe(0);
  });

  test("rechnet Teilzeit korrekt gegen den anteiligen Anspruch", () => {
    const person = employee({ workdays: ["MO", "WE", "FR"], carriedOver: 0 });
    const requests = [request({ id: "r1", from: "2026-06-01", to: "2026-06-12" })];
    const balance = computeBalance(person, YEAR, requests, "2026-05-01");

    expect(balance.annual).toBe(18);
    expect(balance.used).toBe(6);
    expect(balance.remaining).toBe(12);
  });
});
