import type { Employee, LeaveRequest } from "@urlaub/core-rules";
import { createApp } from "../src/app.js";
import { createStore, type LeaveStoreData } from "../src/store.js";

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
    workdays: ["MO", "TU", "WE"],
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

const REQUESTS: LeaveRequest[] = [
  {
    id: "req-0001",
    employeeId: "emp-001",
    from: "2026-02-09",
    to: "2026-02-13",
    status: "approved",
  },
  {
    id: "req-0002",
    employeeId: "emp-001",
    from: "2026-08-03",
    to: "2026-08-07",
    status: "pending",
  },
];

function data(): LeaveStoreData {
  return {
    employees: EMPLOYEES.map((employee) => ({ ...employee })),
    requests: REQUESTS.map((request) => ({ ...request })),
  };
}

function app() {
  return createApp({ store: createStore(data()), today: () => TODAY });
}

async function post(path: string, payload?: unknown) {
  const response = await app().request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe("Halbtage", () => {
  test("bucht einen halben Tag als 0,5 Urlaubstage", async () => {
    const { status, body } = await post("/api/leave-requests", {
      employeeId: "emp-001",
      from: "2026-06-22",
      to: "2026-06-22",
      halfDay: "AM",
    });
    expect(status).toBe(201);
    expect(body.days).toBe(0.5);
    expect((body.request as LeaveRequest).halfDay).toBe("AM");
  });

  test("erlaubt einen halben Tag auch bei Teilzeit", async () => {
    const { status, body } = await post("/api/leave-requests", {
      employeeId: "emp-002",
      from: "2026-06-22",
      to: "2026-06-22",
      halfDay: "PM",
    });
    expect(status).toBe(201);
    expect(body.days).toBe(0.5);
  });

  test("lehnt einen halben Tag an einem vertragsfreien Tag ab", async () => {
    const { status, body } = await post("/api/leave-requests", {
      employeeId: "emp-002",
      from: "2026-06-25",
      to: "2026-06-25",
      halfDay: "AM",
    });
    expect(status).toBe(422);
    expect((body.issues as Array<{ code: string }>).map((issue) => issue.code)).toContain(
      "NO_WORKDAYS",
    );
  });

  test("lehnt einen halben Tag ueber mehrere Tage ab", async () => {
    const { status, body } = await post("/api/leave-requests", {
      employeeId: "emp-001",
      from: "2026-06-22",
      to: "2026-06-23",
      halfDay: "AM",
    });
    expect(status).toBe(422);
    expect((body.issues as Array<{ code: string }>).map((issue) => issue.code)).toContain(
      "HALF_DAY_NOT_SINGLE_DAY",
    );
  });
});
