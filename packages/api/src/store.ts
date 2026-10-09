import { type Employee, type LeaveRequest } from "@urlaub/core-rules";

export interface LeaveStoreData {
  employees: Employee[];
  requests: LeaveRequest[];
}

/**
 * Sehr einfacher In-Memory-Speicher. Die Anwendung hat bewusst keine
 * Datenbank; die Startdaten liegen als JSON im Repository.
 */
export class LeaveStore {
  private readonly employees: Map<string, Employee>;
  private readonly requests: Map<string, LeaveRequest>;
  private sequence = 0;

  constructor(data: LeaveStoreData) {
    this.employees = new Map(data.employees.map((employee) => [employee.id, employee]));
    this.requests = new Map(data.requests.map((request) => [request.id, request]));
    this.sequence = data.requests.length;
  }

  listEmployees(team?: string): Employee[] {
    const all = [...this.employees.values()];
    return team ? all.filter((employee) => employee.team === team) : all;
  }

  getEmployee(id: string): Employee | undefined {
    return this.employees.get(id);
  }

  listRequests(employeeId?: string): LeaveRequest[] {
    const all = [...this.requests.values()];
    return employeeId ? all.filter((request) => request.employeeId === employeeId) : all;
  }

  getRequest(id: string): LeaveRequest | undefined {
    return this.requests.get(id);
  }

  nextRequestId(): string {
    this.sequence += 1;
    return `req-${String(this.sequence).padStart(4, "0")}`;
  }

  save(request: LeaveRequest): LeaveRequest {
    this.requests.set(request.id, request);
    return request;
  }

  snapshot(): LeaveStoreData {
    return {
      employees: this.listEmployees(),
      requests: this.listRequests(),
    };
  }
}

export function createStore(data: LeaveStoreData): LeaveStore {
  return new LeaveStore(data);
}
