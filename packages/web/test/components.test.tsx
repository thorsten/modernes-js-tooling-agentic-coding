import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { BalanceResponse, Employee, LeaveBalance, LeaveRequest } from "@urlaub/shared-types";
import { App } from "../src/App.js";
import type { ApiClient, CreateResult } from "../src/api-client.js";
import { BalanceCard } from "../src/components/BalanceCard.js";
import { LeaveList } from "../src/components/LeaveList.js";
import { LeaveRequestForm } from "../src/components/LeaveRequestForm.js";

const BALANCE: LeaveBalance = {
  year: 2026,
  annual: 30,
  carriedOver: 5,
  carriedOverAvailable: 5,
  used: 10,
  usedFromCarriedOver: 5,
  usedFromAnnual: 5,
  remaining: 30,
};

const EMPLOYEES: Employee[] = [
  {
    id: "emp-001",
    name: "Anna Berger",
    team: "Plattform",
    bundesland: "HB",
    workdays: ["MO", "TU", "WE", "TH", "FR"],
    fullTimeEntitlement: 30,
    hiredAt: "2019-03-01",
    carriedOver: 5,
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
];

const REQUESTS: LeaveRequest[] = [
  { id: "req-1", employeeId: "emp-001", from: "2026-06-22", to: "2026-06-26", status: "approved" },
  { id: "req-2", employeeId: "emp-001", from: "2026-08-03", to: "2026-08-07", status: "pending" },
];

/**
 * Minimaler Spion. Bewusst von Hand geschrieben, damit die Testdatei nicht an
 * die Mock-API eines bestimmten Testrunners gebunden ist.
 */
interface Spy<A extends unknown[], R> {
  (...args: A): R;
  calls: A[];
}

function spy<A extends unknown[], R>(impl: (...args: A) => R): Spy<A, R> {
  const calls: A[] = [];
  const fn = (...args: A): R => {
    calls.push(args);
    return impl(...args);
  };
  return Object.assign(fn, { calls });
}

/** Platzhalter fuer Callbacks, deren Aufruf in diesem Test nicht geprueft wird. */
function noop(): void {
  return undefined;
}

function stubClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    listEmployees: () => Promise.resolve(EMPLOYEES),
    getBalance: (employeeId: string) =>
      Promise.resolve({ employeeId, balance: BALANCE } satisfies BalanceResponse),
    listRequests: () => Promise.resolve({ requests: REQUESTS }),
    createRequest: () => Promise.resolve({ ok: true } satisfies CreateResult),
    ...overrides,
  };
}

describe("BalanceCard", () => {
  test("zeigt einen Hinweis, solange kein Konto geladen ist", () => {
    render(<BalanceCard balance={null} />);
    expect(screen.getByLabelText("Urlaubskonto").textContent).toBe("Kein Konto geladen.");
  });

  test("zeigt Anspruch, Uebertrag, Verbrauch und Rest", () => {
    render(<BalanceCard balance={BALANCE} />);
    expect(screen.getByTestId("annual").textContent).toBe("30");
    expect(screen.getByTestId("carry").textContent).toBe("5");
    expect(screen.getByTestId("used").textContent).toBe("10");
    expect(screen.getByTestId("remaining").textContent).toBe("30");
  });
});

describe("LeaveList", () => {
  test("meldet eine leere Liste", () => {
    render(<LeaveList requests={[]} />);
    expect(screen.getByTestId("empty-list")).toBeDefined();
  });

  test("zeigt eine Zeile je Antrag", () => {
    render(<LeaveList requests={REQUESTS} />);
    expect(screen.getAllByTestId("leave-row")).toHaveLength(2);
  });

  test("uebersetzt den Status ins Deutsche", () => {
    render(<LeaveList requests={REQUESTS} />);
    const rows = screen.getAllByTestId("leave-row");
    expect(rows[0]?.textContent).toContain("genehmigt");
    expect(rows[1]?.textContent).toContain("offen");
  });
});

describe("LeaveRequestForm", () => {
  test("reicht die eingegebenen Werte weiter", () => {
    const onSubmit = spy((values: { from: string; to: string; halfDay?: "AM" | "PM" }) => values);
    render(<LeaveRequestForm employeeId="emp-001" issues={[]} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Von"), { target: { value: "2026-06-22" } });
    fireEvent.change(screen.getByLabelText("Bis"), { target: { value: "2026-06-26" } });
    fireEvent.submit(screen.getByLabelText("Urlaub beantragen"));

    expect(onSubmit.calls).toEqual([
      [{ from: "2026-06-22", to: "2026-06-26", halfDay: undefined }],
    ]);
  });

  test("gibt die Auswahl des halben Tages weiter", () => {
    const onSubmit = spy((values: { from: string; to: string; halfDay?: "AM" | "PM" }) => values);
    render(<LeaveRequestForm employeeId="emp-001" issues={[]} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Von"), { target: { value: "2026-06-22" } });
    fireEvent.change(screen.getByLabelText("Bis"), { target: { value: "2026-06-22" } });
    fireEvent.change(screen.getByLabelText("Halber Tag"), { target: { value: "PM" } });
    fireEvent.submit(screen.getByLabelText("Urlaub beantragen"));

    expect(onSubmit.calls).toEqual([[{ from: "2026-06-22", to: "2026-06-22", halfDay: "PM" }]]);
  });

  test("zeigt gemeldete Fehler an", () => {
    render(
      <LeaveRequestForm
        employeeId="emp-001"
        issues={[{ code: "NO_WORKDAYS", message: "Kein Arbeitstag im Zeitraum." }]}
        onSubmit={noop}
      />,
    );
    expect(screen.getByTestId("issues").textContent).toContain("Kein Arbeitstag im Zeitraum.");
  });

  test("sperrt den Absenden-Knopf waehrend einer laufenden Anfrage", () => {
    render(<LeaveRequestForm employeeId="emp-001" issues={[]} busy onSubmit={noop} />);
    expect(screen.getByRole("button", { name: "Antrag senden" })).toHaveProperty("disabled", true);
  });
});

describe("App", () => {
  test("waehlt den ersten Mitarbeiter und laedt dessen Konto", async () => {
    render(<App client={stubClient()} year={2026} />);

    await waitFor(() => {
      expect(screen.getByTestId("remaining").textContent).toBe("30");
    });
    expect(screen.getAllByTestId("leave-row")).toHaveLength(2);
  });

  test("laedt das Konto neu, wenn der Mitarbeiter gewechselt wird", async () => {
    const getBalance = spy((employeeId: string) =>
      Promise.resolve({ employeeId, balance: BALANCE } satisfies BalanceResponse),
    );
    render(<App client={stubClient({ getBalance })} year={2026} />);

    await waitFor(() => {
      expect(getBalance.calls.map(([id]) => id)).toContain("emp-001");
    });

    fireEvent.change(screen.getByLabelText("Mitarbeiter"), { target: { value: "emp-002" } });

    await waitFor(() => {
      expect(getBalance.calls.map(([id]) => id)).toContain("emp-002");
    });
  });

  test("zeigt die Fehler eines abgelehnten Antrags", async () => {
    const createRequest = spy(() =>
      Promise.resolve({
        ok: false,
        issues: [{ code: "SPANS_YEAR_BOUNDARY" as const, message: "Antrag teilen." }],
      } satisfies CreateResult),
    );
    render(<App client={stubClient({ createRequest })} year={2026} />);

    await waitFor(() => {
      expect(screen.getByTestId("remaining")).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText("Von"), { target: { value: "2026-12-28" } });
    fireEvent.change(screen.getByLabelText("Bis"), { target: { value: "2027-01-04" } });
    fireEvent.submit(screen.getByLabelText("Urlaub beantragen"));

    await waitFor(() => {
      expect(screen.getByTestId("issues").textContent).toContain("Antrag teilen.");
    });
  });
});
