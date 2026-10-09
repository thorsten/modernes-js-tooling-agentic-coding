import { addDays, toIsoDate, type IsoDate } from "./date.js";

/**
 * Ostersonntag nach der Gaussschen Osterformel (gregorianischer Kalender).
 *
 * a  Position im 19-jaehrigen Mondzirkel
 * k  Saekularzahl
 * m  saekulare Mondschaltung
 * n  saekulare Sonnenschaltung
 * d  Abstand des Fruehlingsvollmonds vom 21. Maerz
 * e  Abstand vom Fruehlingsvollmond zum darauffolgenden Sonntag
 */
export function easterSunday(year: number): Date {
  if (!Number.isInteger(year) || year < 1583 || year > 4099) {
    throw new RangeError(
      `Osterformel ist nur fuer gregorianische Jahre 1583-4099 definiert: ${year}`,
    );
  }

  const a = year % 19;
  const b = year % 4;
  const c = year % 7;
  const k = Math.floor(year / 100);
  const p = Math.floor((13 + 8 * k) / 25);
  const q = Math.floor(k / 4);
  const m = (15 - p + k - q) % 30;
  const n = (4 + k - q) % 7;
  const d = (19 * a + m) % 30;
  const preliminaryE = (2 * b + 4 * c + 6 * d + n) % 7;

  // Zwei Ausnahmen der Formel, damit Ostern nie nach dem 25. April faellt.
  let e = preliminaryE;
  if (d === 29 && e === 6) {
    e = -1;
  } else if (d === 28 && e === 6 && a > 10) {
    e = -1;
  }

  // 22. Maerz + d + e, als Tagesoffset auf den 1. Maerz gerechnet.
  const march1 = new Date(Date.UTC(year, 2, 1));
  return addDays(march1, 21 + d + e);
}

export function easterSundayIso(year: number): IsoDate {
  return toIsoDate(easterSunday(year));
}

/**
 * Beweglicher Feiertag als Tagesabstand zum Ostersonntag.
 */
export function relativeToEaster(year: number, offset: number): IsoDate {
  return toIsoDate(addDays(easterSunday(year), offset));
}
