import {
  addIsoDays,
  compareIso,
  eachIsoDay,
  isIsoDate,
  toIsoDate,
  toUtcDate,
  yearOf,
} from "../src/index.js";

describe("toUtcDate", () => {
  test.each(["2026-01-01", "2026-12-31", "2024-02-29", "2000-02-29"])("akzeptiert %s", (iso) => {
    expect(toIsoDate(toUtcDate(iso))).toBe(iso);
  });

  test.each(["2026-1-1", "26-01-01", "2026-13-01", "2026-02-30", "2025-02-29", "nope", ""])(
    "weist %s zurueck",
    (iso) => {
      expect(() => toUtcDate(iso)).toThrow(RangeError);
      expect(isIsoDate(iso)).toBe(false);
    },
  );
});

describe("addIsoDays", () => {
  const CASES: readonly [string, number, string][] = [
    ["2026-01-01", 0, "2026-01-01"],
    ["2026-01-01", 1, "2026-01-02"],
    ["2026-01-01", -1, "2025-12-31"],
    ["2026-02-28", 1, "2026-03-01"],
    ["2024-02-28", 1, "2024-02-29"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2026-06-15", -14, "2026-06-01"],
    ["2026-03-01", -1, "2026-02-28"],
  ];

  test.each(CASES)("%s plus %i Tage ist %s", (from, days, expected) => {
    expect(addIsoDays(from, days)).toBe(expected);
  });
});

describe("eachIsoDay", () => {
  test("liefert beide Grenzen einschliesslich", () => {
    expect(eachIsoDay("2026-03-01", "2026-03-03")).toEqual([
      "2026-03-01",
      "2026-03-02",
      "2026-03-03",
    ]);
  });

  test("liefert genau einen Tag, wenn von und bis gleich sind", () => {
    expect(eachIsoDay("2026-03-01", "2026-03-01")).toEqual(["2026-03-01"]);
  });

  test("liefert nichts, wenn bis vor von liegt", () => {
    expect(eachIsoDay("2026-03-05", "2026-03-01")).toEqual([]);
  });

  test("zaehlt ueber einen Schaltjahresfebruar korrekt", () => {
    expect(eachIsoDay("2024-02-27", "2024-03-01")).toHaveLength(4);
  });
});

describe("compareIso und yearOf", () => {
  test.each([
    ["2026-01-01", "2026-01-02", -1],
    ["2026-01-02", "2026-01-01", 1],
    ["2026-01-01", "2026-01-01", 0],
  ] as const)("compareIso(%s, %s) ist %i", (a, b, expected) => {
    expect(compareIso(a, b)).toBe(expected);
  });

  test.each([
    ["2026-01-01", 2026],
    ["2025-12-31", 2025],
  ] as const)("yearOf(%s) ist %i", (iso, expected) => {
    expect(yearOf(iso)).toBe(expected);
  });
});
