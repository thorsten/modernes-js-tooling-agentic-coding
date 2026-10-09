import { easterSunday, easterSundayIso, relativeToEaster, toIsoDate } from "../src/index.js";

/**
 * Stuetzjahre aus veroeffentlichten Kalendern. Die Liste deckt beide
 * Ausnahmen der Gaussschen Formel ab (1981 und 2049) sowie den
 * spaetestmoeglichen Ostertermin (2038).
 */
const KNOWN_EASTER: readonly [number, string][] = [
  [1900, "1900-04-15"],
  [1954, "1954-04-18"],
  [1981, "1981-04-19"],
  [1999, "1999-04-04"],
  [2000, "2000-04-23"],
  [2010, "2010-04-04"],
  [2018, "2018-04-01"],
  [2019, "2019-04-21"],
  [2020, "2020-04-12"],
  [2021, "2021-04-04"],
  [2022, "2022-04-17"],
  [2023, "2023-04-09"],
  [2024, "2024-03-31"],
  [2025, "2025-04-20"],
  [2026, "2026-04-05"],
  [2027, "2027-03-28"],
  [2028, "2028-04-16"],
  [2029, "2029-04-01"],
  [2030, "2030-04-21"],
  [2031, "2031-04-13"],
  [2032, "2032-03-28"],
  [2033, "2033-04-17"],
  [2034, "2034-04-09"],
  [2035, "2035-03-25"],
  [2038, "2038-04-25"],
  [2049, "2049-04-18"],
];

describe("easterSunday", () => {
  test.each(KNOWN_EASTER)("Ostersonntag %i faellt auf %s", (year, expected) => {
    expect(toIsoDate(easterSunday(year))).toBe(expected);
    expect(easterSundayIso(year)).toBe(expected);
    expect(easterSunday(year).getUTCDay()).toBe(0);
  });

  test("liegt nie vor dem 22. Maerz und nie nach dem 25. April", () => {
    for (let year = 1900; year <= 2100; year += 1) {
      const iso = easterSundayIso(year);
      expect(iso >= `${year}-03-22`).toBe(true);
      expect(iso <= `${year}-04-25`).toBe(true);
    }
  });

  test.each([1582, 4100, 2024.5, Number.NaN])("weist das Jahr %s zurueck", (year) => {
    expect(() => easterSunday(year)).toThrow(RangeError);
  });
});

describe("relativeToEaster", () => {
  const CASES: readonly [string, number, number, string][] = [
    ["Karfreitag", 2026, -2, "2026-04-03"],
    ["Ostermontag", 2026, 1, "2026-04-06"],
    ["Christi Himmelfahrt", 2026, 39, "2026-05-14"],
    ["Pfingstmontag", 2026, 50, "2026-05-25"],
    ["Fronleichnam", 2026, 60, "2026-06-04"],
    ["Karfreitag", 2025, -2, "2025-04-18"],
    ["Christi Himmelfahrt", 2025, 39, "2025-05-29"],
    ["Fronleichnam", 2025, 60, "2025-06-19"],
    ["Ostermontag", 2024, 1, "2024-04-01"],
    ["Christi Himmelfahrt", 2024, 39, "2024-05-09"],
    ["Pfingstmontag", 2024, 50, "2024-05-20"],
    ["Fronleichnam", 2024, 60, "2024-05-30"],
  ];

  test.each(CASES)("%s %i liegt auf %s", (_name, year, offset, expected) => {
    expect(relativeToEaster(year, offset)).toBe(expected);
  });
});
