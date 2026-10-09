import { BUNDESLAENDER, getHolidays, type Bundesland } from "../src/index.js";
import reference from "./fixtures/holidays-2024-2030.json";

/**
 * Die Referenztabelle ist ein eingefrorener Stand, der gegen veroeffentlichte
 * Feiertagskalender geprueft wurde. Sie schuetzt vor stillen Verschiebungen
 * in der Osterrechnung und in den landesspezifischen Regeln.
 */
const TABLE = reference as unknown as Record<string, Record<string, [string, string][]>>;

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030] as const;

const COMBINATIONS: readonly [Bundesland, number][] = BUNDESLAENDER.flatMap((bundesland) =>
  YEARS.map((year) => [bundesland, year] as [Bundesland, number]),
);

describe("Feiertage gegen die Referenztabelle", () => {
  test.each(COMBINATIONS)("%s im Jahr %i", (bundesland, year) => {
    const expected = TABLE[bundesland]?.[String(year)];
    expect(expected).toBeDefined();

    const actual = getHolidays(bundesland, year).map((holiday) => [holiday.date, holiday.name]);
    expect(actual).toEqual(expected);
  });
});
