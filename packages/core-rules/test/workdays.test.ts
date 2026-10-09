import { getHolidays } from "@urlaub/holidays";
import {
  countWorkdays,
  isWorkday,
  listWorkdays,
  weekdayOf,
  type Bundesland,
} from "../src/index.js";
import { ALL_BUNDESLAENDER, PATTERNS } from "./fixtures.js";

/**
 * Unabhaengige Vergleichsrechnung: laeuft mit rohen UTC-Daten ueber den
 * Zeitraum und nutzt von der Fachlogik nichts ausser der Feiertagsliste.
 */
const WEEKDAY_BY_UTC_DAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

function expectedWorkdays(
  from: string,
  to: string,
  workdays: readonly string[],
  bundesland: Bundesland,
): string[] {
  const holidays = new Set<string>();
  for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year += 1) {
    for (const holiday of getHolidays(bundesland, year)) {
      holidays.add(holiday.date);
    }
  }

  const result: string[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let time = Date.parse(`${from}T00:00:00Z`); time <= end; time += 86_400_000) {
    const day = new Date(time);
    const iso = day.toISOString().slice(0, 10);
    if (workdays.includes(WEEKDAY_BY_UTC_DAY[day.getUTCDay()]) && !holidays.has(iso)) {
      result.push(iso);
    }
  }
  return result;
}

const PERIODS: readonly [string, string, string][] = [
  ["Mai 2026", "2026-05-01", "2026-05-31"],
  ["November 2026", "2026-11-01", "2026-11-30"],
];

type Case = [Bundesland, string, string, string, string];

const MATRIX: readonly Case[] = ALL_BUNDESLAENDER.flatMap((bundesland) =>
  PATTERNS.flatMap(([patternName]) =>
    PERIODS.map(
      ([periodName, from, to]) => [bundesland, patternName, periodName, from, to] as Case,
    ),
  ),
);

function patternFor(name: string) {
  const found = PATTERNS.find(([patternName]) => patternName === name);
  if (!found) {
    throw new Error(`Unbekanntes Muster: ${name}`);
  }
  return found[1];
}

describe("countWorkdays ueber alle Bundeslaender und Arbeitszeitmuster", () => {
  test.each(MATRIX)("%s / %s / %s", (bundesland, patternName, _periodName, from, to) => {
    const workdays = patternFor(patternName);
    const expected = expectedWorkdays(from, to, workdays, bundesland);

    expect(listWorkdays(from, to, workdays, bundesland)).toEqual(expected);
    expect(countWorkdays(from, to, workdays, bundesland)).toBe(expected.length);
  });
});

describe("weekdayOf", () => {
  const CASES: readonly [string, string][] = [
    ["2026-06-01", "MO"],
    ["2026-06-02", "TU"],
    ["2026-06-03", "WE"],
    ["2026-06-04", "TH"],
    ["2026-06-05", "FR"],
    ["2026-06-06", "SA"],
    ["2026-06-07", "SU"],
  ];

  test.each(CASES)("%s ist ein %s", (date, expected) => {
    expect(weekdayOf(date)).toBe(expected);
  });
});

describe("isWorkday", () => {
  const FULL_WEEK = ["MO", "TU", "WE", "TH", "FR"] as const;

  test("schliesst Wochenenden ueber die vertraglichen Arbeitstage aus", () => {
    expect(isWorkday("2026-06-06", FULL_WEEK, "NW")).toBe(false);
    expect(isWorkday("2026-06-07", FULL_WEEK, "NW")).toBe(false);
  });

  test("schliesst Feiertage des jeweiligen Bundeslandes aus", () => {
    expect(isWorkday("2026-06-04", FULL_WEEK, "NW")).toBe(false);
    expect(isWorkday("2026-06-04", FULL_WEEK, "NI")).toBe(true);
  });

  test("zaehlt einen Samstag, wenn er vertraglich vereinbart ist", () => {
    expect(isWorkday("2026-06-06", ["SA"], "NW")).toBe(true);
  });

  test("zaehlt einen vertraglichen Samstag nicht, wenn er Feiertag ist", () => {
    expect(isWorkday("2026-12-26", ["SA"], "NW")).toBe(false);
  });
});

describe("feste Stuetzwerte", () => {
  const CASES: readonly [string, Bundesland, string, string, number][] = [
    ["Vollzeit Mai 2026", "NI", "2026-05-01", "2026-05-31", 18],
    ["Vollzeit Mai 2026 mit Fronleichnam", "NW", "2026-05-01", "2026-05-31", 18],
    ["Vollzeit November 2026", "NI", "2026-11-01", "2026-11-30", 21],
    ["Vollzeit November 2026 mit Allerheiligen", "BY", "2026-11-01", "2026-11-30", 21],
    ["Vollzeit November 2026 mit Buss- und Bettag", "SN", "2026-11-01", "2026-11-30", 20],
    ["Vollzeit Juni 2026 mit Fronleichnam", "NW", "2026-06-01", "2026-06-30", 21],
    ["Vollzeit Juni 2026 ohne Fronleichnam", "NI", "2026-06-01", "2026-06-30", 22],
    ["Jahresende 2026 in Berlin", "BE", "2026-12-21", "2026-12-31", 8],
    ["Jahresende 2026 in Bayern", "BY", "2026-12-21", "2026-12-31", 8],
  ];

  test.each(CASES)("%s", (_name, bundesland, from, to, expected) => {
    expect(countWorkdays(from, to, ["MO", "TU", "WE", "TH", "FR"], bundesland)).toBe(expected);
  });
});
