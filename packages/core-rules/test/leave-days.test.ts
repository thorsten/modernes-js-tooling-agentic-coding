import { countLeaveDays, listLeaveDays, type Weekday } from "../src/index.js";
import { employee } from "./fixtures.js";

/**
 * Regel 4 im Zusammenspiel: gezaehlt wird nur, was vertraglicher Arbeitstag
 * und zugleich kein Feiertag im Bundesland des Mitarbeiters ist.
 */
describe("countLeaveDays", () => {
  const CASES: readonly [string, Weekday[], string, string, string, number][] = [
    [
      "Vollzeitwoche ohne Feiertag",
      ["MO", "TU", "WE", "TH", "FR"],
      "HB",
      "2026-06-22",
      "2026-06-26",
      5,
    ],
    [
      "Vollzeitwoche mit Fronleichnam in NW",
      ["MO", "TU", "WE", "TH", "FR"],
      "NW",
      "2026-06-01",
      "2026-06-05",
      4,
    ],
    [
      "Vollzeitwoche mit Fronleichnam ausserhalb NW",
      ["MO", "TU", "WE", "TH", "FR"],
      "HB",
      "2026-06-01",
      "2026-06-05",
      5,
    ],
    [
      "Dreitagewoche ueber zwei Kalenderwochen",
      ["MO", "WE", "FR"],
      "HB",
      "2026-06-22",
      "2026-07-03",
      6,
    ],
    ["Zweitagewoche trifft den Feiertag nicht", ["TU", "TH"], "NW", "2026-06-01", "2026-06-05", 1],
    [
      "Zeitraum ganz im Wochenende",
      ["MO", "TU", "WE", "TH", "FR"],
      "HB",
      "2026-06-20",
      "2026-06-21",
      0,
    ],
  ];

  test.each(CASES)("%s", (_name, workdays, bundesland, from, to, expected) => {
    const person = employee({ workdays, bundesland: bundesland as never });
    expect(countLeaveDays({ from, to }, person)).toBe(expected);
  });

  test("listLeaveDays nennt genau die gezaehlten Tage", () => {
    const person = employee({ workdays: ["MO", "WE", "FR"], bundesland: "NW" });
    expect(listLeaveDays({ from: "2026-06-01", to: "2026-06-07" }, person)).toEqual([
      "2026-06-01",
      "2026-06-03",
      "2026-06-05",
    ]);
  });

  test("Anzahl und Liste sind immer konsistent", () => {
    const person = employee({ workdays: ["MO", "TU", "WE", "TH"], bundesland: "BY" });
    const span = { from: "2026-05-01", to: "2026-06-30" };
    expect(listLeaveDays(span, person)).toHaveLength(countLeaveDays(span, person));
  });
});
