import { Hono } from "hono";
import {
  BUNDESLAENDER,
  canCancel,
  cancelLeaveRequest,
  computeBalance,
  getHolidays,
  isBundesland,
  toIsoDateToday,
  validateLeaveRequest,
  type LeaveRequest,
  type LeaveSpan,
} from "./deps.js";
import type { LeaveStore } from "./store.js";

export interface AppOptions {
  store: LeaveStore;
  /** Einspeisbare Uhr, damit Tests ein festes Heute setzen koennen. */
  today?: () => string;
}

export function createApp(options: AppOptions) {
  const { store } = options;
  const today = options.today ?? toIsoDateToday;

  const app = new Hono();

  app.get("/health", (c) => c.json({ status: "ok", today: today() }));

  app.get("/api/employees", (c) => {
    const team = c.req.query("team");
    return c.json({ employees: store.listEmployees(team) });
  });

  app.get("/api/employees/:id", (c) => {
    const employee = store.getEmployee(c.req.param("id"));
    if (!employee) {
      return c.json({ error: "NOT_FOUND", message: "Mitarbeiter unbekannt." }, 404);
    }
    return c.json(employee);
  });

  app.get("/api/employees/:id/balance", (c) => {
    const employee = store.getEmployee(c.req.param("id"));
    if (!employee) {
      return c.json({ error: "NOT_FOUND", message: "Mitarbeiter unbekannt." }, 404);
    }
    const now = today();
    const yearParam = c.req.query("year");
    const year = yearParam ? Number(yearParam) : Number(now.slice(0, 4));
    if (!Number.isInteger(year)) {
      return c.json({ error: "BAD_REQUEST", message: "Jahr muss eine ganze Zahl sein." }, 400);
    }
    const asOf = Number(now.slice(0, 4)) === year ? now : `${year}-12-31`;
    return c.json({
      employeeId: employee.id,
      balance: computeBalance(employee, year, store.listRequests(), asOf),
    });
  });

  app.get("/api/holidays/:bundesland/:year", (c) => {
    const bundesland = c.req.param("bundesland").toUpperCase();
    const year = Number(c.req.param("year"));
    if (!isBundesland(bundesland)) {
      return c.json(
        {
          error: "BAD_REQUEST",
          message: `Unbekanntes Bundesland. Erlaubt: ${BUNDESLAENDER.join(", ")}.`,
        },
        400,
      );
    }
    if (!Number.isInteger(year) || year < 1900 || year > 2200) {
      return c.json(
        { error: "BAD_REQUEST", message: "Jahr ausserhalb des gueltigen Bereichs." },
        400,
      );
    }
    return c.json({ bundesland, year, holidays: getHolidays(bundesland, year) });
  });

  app.get("/api/leave-requests", (c) => {
    const employeeId = c.req.query("employeeId");
    return c.json({ requests: store.listRequests(employeeId) });
  });

  app.post("/api/leave-requests", async (c) => {
    const body = await c.req.json<Partial<Record<string, unknown>>>().catch(() => null);
    if (!body || typeof body.employeeId !== "string") {
      return c.json({ error: "BAD_REQUEST", message: "employeeId fehlt." }, 400);
    }
    const employee = store.getEmployee(body.employeeId);
    if (!employee) {
      return c.json({ error: "NOT_FOUND", message: "Mitarbeiter unbekannt." }, 404);
    }
    if (typeof body.from !== "string" || typeof body.to !== "string") {
      return c.json({ error: "BAD_REQUEST", message: "from und to muessen Strings sein." }, 400);
    }

    let halfDay: "AM" | "PM" | undefined;
    if (body.halfDay === "AM") {
      halfDay = "AM";
    } else if (body.halfDay === "PM") {
      halfDay = "PM";
    }

    const span: LeaveSpan = { from: body.from, to: body.to, halfDay };

    const result = validateLeaveRequest(span, {
      employee,
      employees: store.listEmployees(),
      requests: store.listRequests(),
      today: today(),
    });

    if (!result.valid) {
      return c.json({ error: "VALIDATION_FAILED", issues: result.errors }, 422);
    }

    const request: LeaveRequest = {
      id: store.nextRequestId(),
      employeeId: employee.id,
      from: span.from,
      to: span.to,
      halfDay,
      status: "pending",
    };
    store.save(request);

    return c.json({ request, days: result.days, warnings: result.warnings }, 201);
  });

  app.post("/api/leave-requests/:id/approve", (c) => {
    const request = store.getRequest(c.req.param("id"));
    if (!request) {
      return c.json({ error: "NOT_FOUND", message: "Antrag unbekannt." }, 404);
    }
    if (request.status !== "pending") {
      return c.json(
        { error: "CONFLICT", message: "Nur offene Antraege koennen genehmigt werden." },
        409,
      );
    }
    return c.json({ request: store.save({ ...request, status: "approved" }) });
  });

  app.post("/api/leave-requests/:id/cancel", (c) => {
    const request = store.getRequest(c.req.param("id"));
    if (!request) {
      return c.json({ error: "NOT_FOUND", message: "Antrag unbekannt." }, 404);
    }
    if (!canCancel(request, today())) {
      return c.json(
        {
          error: "CANCEL_NOT_ALLOWED",
          message: "Ein Antrag kann nur storniert werden, solange er in der Zukunft beginnt.",
        },
        409,
      );
    }
    return c.json({ request: store.save(cancelLeaveRequest(request, today())) });
  });

  app.notFound((c) => c.json({ error: "NOT_FOUND", message: "Route unbekannt." }, 404));

  return app;
}
