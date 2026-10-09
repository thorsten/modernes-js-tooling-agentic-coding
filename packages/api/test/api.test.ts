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

async function get(path: string) {
  const response = await app().request(path);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

async function post(path: string, payload?: unknown) {
  const response = await app().request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe("GET /health", () => {
  test("meldet den Bezugstag der Anwendung", async () => {
    const { status, body } = await get("/health");
    expect(status).toBe(200);
    expect(body).toEqual({ status: "ok", today: TODAY });
  });
});

describe("Mitarbeiter-Endpunkte", () => {
  test("listet alle Mitarbeiter", async () => {
    const { status, body } = await get("/api/employees");
    expect(status).toBe(200);
    expect(body.employees).toHaveLength(3);
  });

  test("filtert nach Team", async () => {
    const { body } = await get("/api/employees?team=Kundenportal");
    expect((body.employees as Employee[]).map((employee) => employee.id)).toEqual(["emp-003"]);
  });

  test("liefert einen einzelnen Mitarbeiter", async () => {
    const { status, body } = await get("/api/employees/emp-002");
    expect(status).toBe(200);
    expect(body.name).toBe("Bernd Kowalski");
  });

  test("antwortet mit 404 fuer eine unbekannte Id", async () => {
    const { status, body } = await get("/api/employees/emp-999");
    expect(status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });
});

describe("GET /api/employees/:id/balance", () => {
  test("rechnet Anspruch und Verbrauch zusammen", async () => {
    const { status, body } = await get("/api/employees/emp-001/balance?year=2026");
    const balance = body.balance as Record<string, number>;
    expect(status).toBe(200);
    expect(balance.annual).toBe(30);
    expect(balance.used).toBe(10);
    expect(balance.remaining).toBe(20);
  });

  test("beruecksichtigt die Teilzeitquote", async () => {
    const { body } = await get("/api/employees/emp-002/balance?year=2026");
    expect((body.balance as Record<string, number>).annual).toBe(18);
  });

  test("weist ein unsinniges Jahr ab", async () => {
    const { status, body } = await get("/api/employees/emp-001/balance?year=zweitausend");
    expect(status).toBe(400);
    expect(body.error).toBe("BAD_REQUEST");
  });
});

describe("GET /api/holidays/:bundesland/:year", () => {
  test("liefert die Feiertage eines Landes", async () => {
    const { status, body } = await get("/api/holidays/NW/2026");
    expect(status).toBe(200);
    expect(body.bundesland).toBe("NW");
    expect((body.holidays as { date: string }[]).map((holiday) => holiday.date)).toContain(
      "2026-06-04",
    );
  });

  test("akzeptiert ein Kuerzel in Kleinschreibung", async () => {
    const { status, body } = await get("/api/holidays/by/2026");
    expect(status).toBe(200);
    expect(body.bundesland).toBe("BY");
  });

  const BAD_REQUESTS: readonly [string, string][] = [
    ["unbekanntes Bundesland", "/api/holidays/XX/2026"],
    ["Jahr ausserhalb des Bereichs", "/api/holidays/NW/1234"],
  ];

  test.each(BAD_REQUESTS)("%s ergibt 400", async (_name, path) => {
    const { status } = await get(path);
    expect(status).toBe(400);
  });
});

describe("GET /api/leave-requests", () => {
  test("listet alle Antraege", async () => {
    const { body } = await get("/api/leave-requests");
    expect(body.requests).toHaveLength(2);
  });

  test("filtert nach Mitarbeiter", async () => {
    const { body } = await get("/api/leave-requests?employeeId=emp-002");
    expect(body.requests).toHaveLength(0);
  });
});

describe("POST /api/leave-requests", () => {
  test("legt einen Antrag an und meldet die Tageszahl", async () => {
    const { status, body } = await post("/api/leave-requests", {
      employeeId: "emp-001",
      from: "2026-06-22",
      to: "2026-06-26",
    });
    expect(status).toBe(201);
    expect(body.days).toBe(5);
    expect((body.request as LeaveRequest).status).toBe("pending");
  });

  test("meldet die Teamwarnung, ohne den Antrag abzulehnen", async () => {
    const store = createStore(data());
    store.save({
      id: "req-9001",
      employeeId: "emp-002",
      from: "2026-06-22",
      to: "2026-06-26",
      status: "approved",
    });
    const response = await createApp({ store, today: () => TODAY }).request("/api/leave-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ employeeId: "emp-001", from: "2026-06-22", to: "2026-06-26" }),
    });
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(201);
    expect((body.warnings as { code: string }[]).map((issue) => issue.code)).toContain(
      "TEAM_COVERAGE",
    );
  });

  const INVALID_BODIES: readonly [string, unknown, number][] = [
    ["ohne employeeId", { from: "2026-06-22", to: "2026-06-26" }, 400],
    [
      "mit unbekanntem Mitarbeiter",
      { employeeId: "emp-999", from: "2026-06-22", to: "2026-06-26" },
      404,
    ],
    ["ohne Datumsangaben", { employeeId: "emp-001" }, 400],
  ];

  test.each(INVALID_BODIES)("%s ergibt %i", async (_name, payload, expected) => {
    const { status } = await post("/api/leave-requests", payload);
    expect(status).toBe(expected);
  });

  const REJECTED: readonly [string, string, string, string][] = [
    ["ueber den Jahreswechsel", "2026-12-28", "2027-01-04", "SPANS_YEAR_BOUNDARY"],
    ["zu weit in der Vergangenheit", "2026-05-04", "2026-05-08", "REQUEST_TOO_FAR_IN_PAST"],
    ["ohne Arbeitstag", "2026-06-20", "2026-06-21", "NO_WORKDAYS"],
  ];

  test.each(REJECTED)("%s ergibt 422 mit %s", async (_name, from, to, code) => {
    const { status, body } = await post("/api/leave-requests", {
      employeeId: "emp-001",
      from,
      to,
    });
    expect(status).toBe(422);
    expect(body.error).toBe("VALIDATION_FAILED");
    expect((body.issues as { code: string }[]).map((issue) => issue.code)).toContain(code);
  });
});

describe("Genehmigen und Stornieren", () => {
  test("genehmigt einen offenen Antrag", async () => {
    const { status, body } = await post("/api/leave-requests/req-0002/approve");
    expect(status).toBe(200);
    expect((body.request as LeaveRequest).status).toBe("approved");
  });

  test("lehnt das Genehmigen eines bereits genehmigten Antrags ab", async () => {
    const { status, body } = await post("/api/leave-requests/req-0001/approve");
    expect(status).toBe(409);
    expect(body.error).toBe("CONFLICT");
  });

  test("storniert einen Antrag in der Zukunft", async () => {
    const { status, body } = await post("/api/leave-requests/req-0002/cancel");
    expect(status).toBe(200);
    expect((body.request as LeaveRequest).status).toBe("cancelled");
  });

  test("verweigert das Stornieren eines vergangenen Antrags", async () => {
    const { status, body } = await post("/api/leave-requests/req-0001/cancel");
    expect(status).toBe(409);
    expect(body.error).toBe("CANCEL_NOT_ALLOWED");
  });

  test("antwortet mit 404 fuer einen unbekannten Antrag", async () => {
    const { status } = await post("/api/leave-requests/req-9999/approve");
    expect(status).toBe(404);
  });
});

describe("Unbekannte Routen", () => {
  test("antworten mit 404 als JSON", async () => {
    const { status, body } = await get("/api/gibtesnicht");
    expect(status).toBe(404);
    expect(body.error).toBe("NOT_FOUND");
  });
});
