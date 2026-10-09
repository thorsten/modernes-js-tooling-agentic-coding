/**
 * Alle Datumswerte im Projekt sind ISO-Kalendertage im Format YYYY-MM-DD.
 * Gerechnet wird ausschliesslich in UTC, damit Zeitzonen das Ergebnis nicht
 * verschieben koennen.
 */
export type IsoDate = string;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export function toUtcDate(iso: IsoDate): Date {
  if (!ISO_DATE_PATTERN.test(iso)) {
    throw new RangeError(`Kein gueltiges ISO-Datum: ${iso}`);
  }
  const parts = iso.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError(`Kalendarisch unmoegliches Datum: ${iso}`);
  }
  return date;
}

export function toIsoDate(date: Date): IsoDate {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }
  try {
    toUtcDate(value);
    return true;
  } catch {
    return false;
  }
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function addIsoDays(iso: IsoDate, days: number): IsoDate {
  return toIsoDate(addDays(toUtcDate(iso), days));
}

export function compareIso(a: IsoDate, b: IsoDate): number {
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}

export function eachIsoDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const end = toUtcDate(to).getTime();
  const days: IsoDate[] = [];
  let cursor = toUtcDate(from);
  while (cursor.getTime() <= end) {
    days.push(toIsoDate(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function yearOf(iso: IsoDate): number {
  return toUtcDate(iso).getUTCFullYear();
}
