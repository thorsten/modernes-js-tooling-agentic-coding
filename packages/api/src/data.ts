import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Employee, LeaveRequest } from "@urlaub/core-rules";
import type { LeaveStoreData } from "./store.js";

/**
 * Wurzel des Repositories: von der aktuellen Arbeitsverzeichnis aus nach oben,
 * bis die Workspace-Datei auftaucht. So funktioniert der Aufruf sowohl aus dem
 * Repo-Wurzelverzeichnis als auch aus packages/api heraus.
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

export function dataDir(): string {
  return resolve(findRepoRoot(), "data");
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function loadStoreData(directory = dataDir()): LeaveStoreData {
  return {
    employees: readJson<Employee[]>(resolve(directory, "employees.json")),
    requests: readJson<LeaveRequest[]>(resolve(directory, "absences.json")),
  };
}
