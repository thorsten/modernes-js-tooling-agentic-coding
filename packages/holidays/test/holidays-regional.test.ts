import {
  BUNDESLAENDER,
  bussUndBettag,
  getHolidays,
  holidayName,
  isHoliday,
  type Bundesland,
} from "../src/index.js";

const YEAR = 2026;

const NATIONWIDE = [
  "Neujahr",
  "Karfreitag",
  "Ostermontag",
  "Tag der Arbeit",
  "Christi Himmelfahrt",
  "Pfingstmontag",
  "Tag der Deutschen Einheit",
  "1. Weihnachtstag",
  "2. Weihnachtstag",
] as const;

/**
 * Jeder landesspezifische Feiertag mit der vollstaendigen Liste der Laender,
 * in denen er gilt. Eine Zeile hier ist die Fachregel, kein Stichprobenwert.
 */
const REGIONAL: readonly [string, readonly Bundesland[]][] = [
  ["Heilige Drei Koenige", ["BW", "BY", "ST"]],
  ["Internationaler Frauentag", ["BE", "MV"]],
  ["Fronleichnam", ["BW", "BY", "HE", "NW", "RP", "SL"]],
  ["Mariae Himmelfahrt", ["BY", "SL"]],
  ["Weltkindertag", ["TH"]],
  ["Reformationstag", ["BB", "HB", "HH", "MV", "NI", "SN", "ST", "SH", "TH"]],
  ["Allerheiligen", ["BW", "BY", "NW", "RP", "SL"]],
  ["Buss- und Bettag", ["SN"]],
];

describe("landesspezifische Feiertage", () => {
  test.each(REGIONAL)("%s gilt genau in den erwarteten Laendern", (name, states) => {
    const actual = BUNDESLAENDER.filter((bundesland) =>
      getHolidays(bundesland, YEAR).some((holiday) => holiday.name === name),
    );
    expect(actual).toEqual(
      states.toSorted((a, b) => BUNDESLAENDER.indexOf(a) - BUNDESLAENDER.indexOf(b)),
    );
  });

  test("kein Land traegt einen Feiertag doppelt", () => {
    for (const bundesland of BUNDESLAENDER) {
      const dates = getHolidays(bundesland, YEAR).map((holiday) => holiday.date);
      expect(new Set(dates).size).toBe(dates.length);
    }
  });
});

describe("bundesweite Feiertage", () => {
  test.each(BUNDESLAENDER)("%s kennt alle neun bundesweiten Feiertage", (bundesland) => {
    const names = getHolidays(bundesland, YEAR).map((holiday) => holiday.name);
    for (const name of NATIONWIDE) {
      expect(names).toContain(name);
    }
    const nationwideEntries = getHolidays(bundesland, YEAR).filter((holiday) => holiday.nationwide);
    expect(nationwideEntries).toHaveLength(NATIONWIDE.length);
  });
});

describe("Buss- und Bettag", () => {
  const CASES: readonly [number, string][] = [
    [2024, "2024-11-20"],
    [2025, "2025-11-19"],
    [2026, "2026-11-18"],
    [2027, "2027-11-17"],
    [2028, "2028-11-22"],
    [2029, "2029-11-21"],
    [2030, "2030-11-20"],
  ];

  test.each(CASES)("liegt %i auf %s", (year, expected) => {
    expect(bussUndBettag(year)).toBe(expected);
    expect(isHoliday(expected, "SN")).toBe(true);
    expect(isHoliday(expected, "TH")).toBe(false);
  });
});

describe("isHoliday und holidayName", () => {
  const CASES: readonly [string, Bundesland, boolean, string | undefined][] = [
    ["2026-01-01", "NW", true, "Neujahr"],
    ["2026-01-06", "BW", true, "Heilige Drei Koenige"],
    ["2026-01-06", "NW", false, undefined],
    ["2026-03-08", "BE", true, "Internationaler Frauentag"],
    ["2026-03-08", "HH", false, undefined],
    ["2026-06-04", "HE", true, "Fronleichnam"],
    ["2026-06-04", "NI", false, undefined],
    ["2026-08-15", "SL", true, "Mariae Himmelfahrt"],
    ["2026-09-20", "TH", true, "Weltkindertag"],
    ["2026-10-31", "SH", true, "Reformationstag"],
    ["2026-11-01", "RP", true, "Allerheiligen"],
    ["2026-12-26", "BB", true, "2. Weihnachtstag"],
    ["2026-07-14", "BY", false, undefined],
  ];

  test.each(CASES)("%s in %s", (date, bundesland, expected, name) => {
    expect(isHoliday(date, bundesland)).toBe(expected);
    expect(holidayName(date, bundesland)).toBe(name);
  });
});
