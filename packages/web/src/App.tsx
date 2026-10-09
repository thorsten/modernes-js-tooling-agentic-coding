import { useCallback, useEffect, useState } from "react";
import type { Employee, LeaveBalance, LeaveRequest, ValidationIssue } from "@urlaub/shared-types";
import type { ApiClient } from "./api-client.js";
import { BalanceCard } from "./components/BalanceCard.js";
import { LeaveList } from "./components/LeaveList.js";
import { LeaveRequestForm } from "./components/LeaveRequestForm.js";

export interface AppProps {
  client: ApiClient;
  year?: number;
}

interface Overview {
  balance: LeaveBalance;
  requests: LeaveRequest[];
}

export function App({ client, year = new Date().getFullYear() }: AppProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState("");
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void client.listEmployees().then((list) => {
      if (!active) {
        return;
      }
      setEmployees(list);
      setSelected((current) => current || (list[0]?.id ?? ""));
    });
    return () => {
      active = false;
    };
  }, [client]);

  /** Laedt Anspruch und Antraege, ohne selbst State zu setzen. */
  const loadOverview = useCallback(
    async (employeeId: string): Promise<Overview | null> => {
      if (!employeeId) {
        return null;
      }
      const [balanceResponse, requestList] = await Promise.all([
        client.getBalance(employeeId, year),
        client.listRequests(employeeId),
      ]);
      return { balance: balanceResponse.balance, requests: requestList.requests };
    },
    [client, year],
  );

  const applyOverview = useCallback((overview: Overview | null) => {
    if (!overview) {
      return;
    }
    setBalance(overview.balance);
    setRequests(overview.requests);
  }, []);

  useEffect(() => {
    let active = true;
    void loadOverview(selected).then((overview) => {
      if (active) {
        applyOverview(overview);
      }
    });
    return () => {
      active = false;
    };
  }, [applyOverview, loadOverview, selected]);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">Urlaubsverwaltung</h1>
          <p className="app-subtitle">Urlaubsjahr {year}</p>
        </div>

        <div className="employee-picker">
          <label htmlFor="employee">Mitarbeiter</label>
          <select
            id="employee"
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setIssues([]);
            }}
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="layout">
        <div className="column">
          <BalanceCard balance={balance} />

          <LeaveRequestForm
            employeeId={selected}
            issues={issues}
            busy={busy}
            onSubmit={(values) => {
              setBusy(true);
              void client
                .createRequest({ employeeId: selected, ...values })
                .then(async (result) => {
                  setIssues(result.ok ? [] : (result.issues ?? []));
                  applyOverview(await loadOverview(selected));
                })
                .finally(() => {
                  setBusy(false);
                });
            }}
          />
        </div>

        <div className="column">
          <LeaveList requests={requests} />
        </div>
      </main>
    </div>
  );
}
