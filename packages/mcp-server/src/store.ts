import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Employee, LeaveRequest } from "@urlaub/core-rules";

/**
 * Wurzel des Repositories: vom Arbeitsverzeichnis aus nach oben, bis die
 * Workspace-Datei auftaucht.
 */
export function findRepoRoot(start: string = process.cwd()): string {
  let current = resolve(start);
  for (;;) {
    if (existsSync(resolve(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error("Repository-Wurzel nicht gefunden: pnpm-workspace.yaml fehlt.");
    }
    current = parent;
  }
}

export interface HrData {
  employees: Employee[];
  absences: LeaveRequest[];
}

/**
 * Liest und schreibt die beiden JSON-Dateien unter data/. Bewusst ohne Cache:
 * Der Server ist kurzlebig und soll immer den Stand auf der Platte sehen.
 */
export class HrStore {
  readonly employeesFile: string;
  readonly absencesFile: string;

  constructor(directory: string = resolve(findRepoRoot(), "data")) {
    this.employeesFile = resolve(directory, "employees.json");
    this.absencesFile = resolve(directory, "absences.json");
  }

  read(): HrData {
    return {
      employees: JSON.parse(readFileSync(this.employeesFile, "utf8")) as Employee[],
      absences: JSON.parse(readFileSync(this.absencesFile, "utf8")) as LeaveRequest[],
    };
  }

  writeAbsences(absences: readonly LeaveRequest[]): void {
    writeFileSync(this.absencesFile, `${JSON.stringify(absences, undefined, 2)}\n`, "utf8");
  }

  nextRequestId(absences: readonly LeaveRequest[]): string {
    const numbers = absences
      .map((absence) => Number(absence.id.replace(/^\D+/u, "")))
      .filter((value) => Number.isInteger(value) && value > 0);
    const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `req-${String(next).padStart(4, "0")}`;
  }
}
