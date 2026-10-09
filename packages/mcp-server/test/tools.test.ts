import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import type { Employee, LeaveRequest } from "@urlaub/core-rules";
import { HrStore } from "../src/store.js";
import {
  getEmployee,
  holidaysFor,
  listAbsences,
  listEmployees,
  requestLeave,
  ToolError,
} from "../src/tools.js";

const TODAY = "2026-06-15";

const EMPLOYEES: Employee[] = [
  {
    id: "emp-001",
    name: "Anna Berger",
    team: "Plattform",
    bundesland: "HB",
    workdays: ["MO", "TU", "WE", "TH", "FR"],
    fullTimeEntitlement: 30,
    hiredAt: "2019-03-01",
    carriedOver: 0,
  },
  {
    id: "emp-002",
    name: "Bernd Kowalski",
    team: "Plattform",
    bundesland: "HB",
    workdays: ["MO", "WE", "FR"],
    fullTimeEntitlement: 30,
    hiredAt: "2021-09-01",
    carriedOver: 0,
  },
  {
    id: "emp-003",
    name: "Chiara Lorenz",
    team: "Kundenportal",
    bundesland: "NW",
    workdays: ["MO", "TU", "WE", "TH", "FR"],
    fullTimeEntitlement: 30,
    hiredAt: "2020-01-01",
    carriedOver: 0,
  },
];

const ABSENCES: LeaveRequest[] = [
  {
    id: "req-0001",
    employeeId: "emp-001",
    from: "2026-07-06",
    to: "2026-07-10",
    status: "approved",
  },
  {
    id: "req-0002",
    employeeId: "emp-002",
    from: "2026-07-08",
    to: "2026-07-08",
    status: "pending",
  },
  {
    id: "req-0003",
    employeeId: "emp-003",
    from: "2026-07-06",
    to: "2026-07-07",
    status: "approved",
  },
];

let directory: string;
let store: HrStore;

beforeEach(() => {
  directory = mkdtempSync(resolve(tmpdir(), "urlaub-mcp-"));
  writeFileSync(resolve(directory, "employees.json"), JSON.stringify(EMPLOYEES), "utf8");
  writeFileSync(resolve(directory, "absences.json"), JSON.stringify(ABSENCES), "utf8");
  store = new HrStore(directory);
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

describe("get_employee", () => {
  test("liefert den Stammdatensatz", () => {
    expect(getEmployee(store, "emp-002").name).toBe("Bernd Kowalski");
  });

  test("nennt bei unbekannter Id bekannte Ids", () => {
    expect(() => getEmployee(store, "emp-999")).toThrow(ToolError);
    expect(() => getEmployee(store, "emp-999")).toThrow(/list_employees/u);
  });
});

describe("list_employees", () => {
  test("liefert ohne Argument alle Personen", () => {
    expect(listEmployees(store)).toHaveLength(3);
  });

  test("filtert exakt nach Team", () => {
    expect(listEmployees(store, "Plattform").map((employee) => employee.id)).toEqual([
      "emp-001",
      "emp-002",
    ]);
  });

  test("meldet die vorhandenen Teams, wenn der Name nicht passt", () => {
    expect(() => listEmployees(store, "plattform")).toThrow(/Kundenportal/u);
  });
});

describe("list_absences", () => {
  test("liefert nur genehmigte Abwesenheiten des Teams", () => {
    const entries = listAbsences(store, "Plattform", "2026-07-01", "2026-07-31");
    expect(entries).toEqual([
      {
        employeeId: "emp-001",
        employeeName: "Anna Berger",
        from: "2026-07-06",
        to: "2026-07-10",
      },
    ]);
  });

  test("beruecksichtigt nur ueberschneidende Zeitraeume", () => {
    expect(listAbsences(store, "Plattform", "2026-08-01", "2026-08-31")).toEqual([]);
  });

  test("weist einen verdrehten Zeitraum ab", () => {
    expect(() => listAbsences(store, "Plattform", "2026-07-31", "2026-07-01")).toThrow(ToolError);
  });
});

describe("get_holidays", () => {
  test("liefert die Feiertage eines Landes", () => {
    const dates = holidaysFor("NW", 2026).map((holiday) => holiday.date);
    expect(dates).toContain("2026-06-04");
  });

  test("akzeptiert Kleinschreibung", () => {
    expect(holidaysFor("by", 2026).length).toBeGreaterThan(0);
  });

  const INVALID: ReadonlyArray<[string, string, number]> = [
    ["unbekanntes Kuerzel", "XX", 2026],
    ["Jahr zu frueh", "NW", 1999],
    ["Jahr zu spaet", "NW", 2100],
  ];

  test.each(INVALID)("%s wird abgewiesen", (_name, bundesland, year) => {
    expect(() => holidaysFor(bundesland, year)).toThrow(ToolError);
  });
});

describe("request_leave", () => {
  test("schreibt einen neuen Antrag in die Datei", () => {
    const result = requestLeave(
      store,
      { employeeId: "emp-001", from: "2026-07-20", to: "2026-07-24" },
      TODAY,
    );

    expect(result.days).toBe(5);
    expect(result.request.id).toBe("req-0004");
    expect(result.request.status).toBe("pending");

    const written = JSON.parse(
      readFileSync(resolve(directory, "absences.json"), "utf8"),
    ) as LeaveRequest[];
    expect(written).toHaveLength(4);
    expect(written.at(-1)?.id).toBe("req-0004");
  });

  test("bucht einen halben Tag bei Teilzeit", () => {
    const result = requestLeave(
      store,
      { employeeId: "emp-002", from: "2026-07-20", to: "2026-07-20", halfDay: "AM" },
      TODAY,
    );
    expect(result.days).toBe(0.5);
    expect(result.request.halfDay).toBe("AM");
  });

  test("schreibt nichts, wenn eine Fachregel verletzt ist", () => {
    expect(() =>
      requestLeave(store, { employeeId: "emp-001", from: "2026-12-28", to: "2027-01-04" }, TODAY),
    ).toThrow(/SPANS_YEAR_BOUNDARY/u);

    const written = JSON.parse(
      readFileSync(resolve(directory, "absences.json"), "utf8"),
    ) as LeaveRequest[];
    expect(written).toHaveLength(3);
  });

  test("meldet eine unbekannte Id als Fehler", () => {
    expect(() =>
      requestLeave(store, { employeeId: "emp-999", from: "2026-07-20", to: "2026-07-24" }, TODAY),
    ).toThrow(ToolError);
  });
});
