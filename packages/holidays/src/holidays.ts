import { BUNDESLAENDER, type Bundesland } from "./bundesland.js";
import { addDays, toIsoDate, toUtcDate, type IsoDate } from "./date.js";
import { relativeToEaster } from "./easter.js";

export interface Holiday {
  date: IsoDate;
  name: string;
  /** true, wenn der Tag in allen 16 Bundeslaendern gilt. */
  nationwide: boolean;
}

interface FixedRule {
  kind: "fixed";
  name: string;
  month: number;
  day: number;
  states: readonly Bundesland[];
}

interface EasterRule {
  kind: "easter";
  name: string;
  offset: number;
  states: readonly Bundesland[];
}

interface ComputedRule {
  kind: "computed";
  name: string;
  compute: (year: number) => IsoDate;
  states: readonly Bundesland[];
}

type HolidayRule = FixedRule | EasterRule | ComputedRule;

const ALL = BUNDESLAENDER;

/**
 * Mittwoch vor dem 23. November.
 */
export function bussUndBettag(year: number): IsoDate {
  const reference = toUtcDate(`${year}-11-23`);
  const weekday = reference.getUTCDay();
  let back = weekday - 3;
  if (back <= 0) {
    back += 7;
  }
  return toIsoDate(addDays(reference, -back));
}

const RULES: readonly HolidayRule[] = [
  { kind: "fixed", name: "Neujahr", month: 1, day: 1, states: ALL },
  {
    kind: "fixed",
    name: "Heilige Drei Koenige",
    month: 1,
    day: 6,
    states: ["BW", "BY", "ST"],
  },
  {
    kind: "fixed",
    name: "Internationaler Frauentag",
    month: 3,
    day: 8,
    states: ["BE", "MV"],
  },
  { kind: "easter", name: "Karfreitag", offset: -2, states: ALL },
  { kind: "easter", name: "Ostermontag", offset: 1, states: ALL },
  { kind: "fixed", name: "Tag der Arbeit", month: 5, day: 1, states: ALL },
  { kind: "easter", name: "Christi Himmelfahrt", offset: 39, states: ALL },
  { kind: "easter", name: "Pfingstmontag", offset: 50, states: ALL },
  {
    kind: "easter",
    name: "Fronleichnam",
    offset: 60,
    states: ["BW", "BY", "HE", "NW", "RP", "SL"],
  },
  {
    kind: "fixed",
    name: "Mariae Himmelfahrt",
    month: 8,
    day: 15,
    states: ["BY", "SL"],
  },
  {
    kind: "fixed",
    name: "Weltkindertag",
    month: 9,
    day: 20,
    states: ["TH"],
  },
  {
    kind: "fixed",
    name: "Tag der Deutschen Einheit",
    month: 10,
    day: 3,
    states: ALL,
  },
  {
    kind: "fixed",
    name: "Reformationstag",
    month: 10,
    day: 31,
    states: ["BB", "HB", "HH", "MV", "NI", "SN", "ST", "SH", "TH"],
  },
  {
    kind: "fixed",
    name: "Allerheiligen",
    month: 11,
    day: 1,
    states: ["BW", "BY", "NW", "RP", "SL"],
  },
  {
    kind: "computed",
    name: "Buss- und Bettag",
    compute: bussUndBettag,
    states: ["SN"],
  },
  { kind: "fixed", name: "1. Weihnachtstag", month: 12, day: 25, states: ALL },
  { kind: "fixed", name: "2. Weihnachtstag", month: 12, day: 26, states: ALL },
];

function ruleDate(rule: HolidayRule, year: number): IsoDate {
  switch (rule.kind) {
    case "fixed": {
      const month = String(rule.month).padStart(2, "0");
      const day = String(rule.day).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    case "easter":
      return relativeToEaster(year, rule.offset);
    case "computed":
      return rule.compute(year);
  }
}

const cache = new Map<string, readonly Holiday[]>();

/**
 * Alle gesetzlichen Feiertage eines Bundeslandes in einem Kalenderjahr,
 * aufsteigend nach Datum sortiert.
 */
export function getHolidays(bundesland: Bundesland, year: number): Holiday[] {
  const key = `${bundesland}:${year}`;
  const cached = cache.get(key);
  if (cached) {
    return cached.map((holiday) => ({ ...holiday }));
  }

  const holidays = RULES.filter((rule) => rule.states.includes(bundesland))
    .map((rule) => ({
      date: ruleDate(rule, year),
      name: rule.name,
      nationwide: rule.states.length === ALL.length,
    }))
    .toSorted((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  cache.set(key, holidays);
  return holidays.map((holiday) => ({ ...holiday }));
}

export function getHolidayDates(bundesland: Bundesland, year: number): Set<IsoDate> {
  return new Set(getHolidays(bundesland, year).map((holiday) => holiday.date));
}

export function isHoliday(date: IsoDate, bundesland: Bundesland): boolean {
  const year = toUtcDate(date).getUTCFullYear();
  return getHolidayDates(bundesland, year).has(date);
}

export function holidayName(date: IsoDate, bundesland: Bundesland): string | undefined {
  const year = toUtcDate(date).getUTCFullYear();
  return getHolidays(bundesland, year).find((holiday) => holiday.date === date)?.name;
}

/**
 * Namen aller Feiertage, die in mindestens einem Bundesland gelten.
 */
export const HOLIDAY_NAMES: readonly string[] = RULES.map((rule) => rule.name);
