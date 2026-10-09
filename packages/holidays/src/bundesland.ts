/**
 * Die 16 deutschen Bundeslaender als ISO-3166-2:DE-Kuerzel ohne Praefix.
 */
export type Bundesland =
  | "BW"
  | "BY"
  | "BE"
  | "BB"
  | "HB"
  | "HH"
  | "HE"
  | "MV"
  | "NI"
  | "NW"
  | "RP"
  | "SL"
  | "SN"
  | "ST"
  | "SH"
  | "TH";

export const BUNDESLAENDER: readonly Bundesland[] = [
  "BW",
  "BY",
  "BE",
  "BB",
  "HB",
  "HH",
  "HE",
  "MV",
  "NI",
  "NW",
  "RP",
  "SL",
  "SN",
  "ST",
  "SH",
  "TH",
] as const;

export const BUNDESLAND_NAMES: Readonly<Record<Bundesland, string>> = {
  BW: "Baden-Wuerttemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thueringen",
};

export function isBundesland(value: string): value is Bundesland {
  return (BUNDESLAENDER as readonly string[]).includes(value);
}
