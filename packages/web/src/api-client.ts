import {
  API_ROUTES,
  type BalanceResponse,
  type CreateLeaveRequestBody,
  type Employee,
  type EmployeeListResponse,
  type LeaveRequestCreated,
  type LeaveRequestListResponse,
  type ValidationIssue,
} from "@urlaub/shared-types";

export interface CreateResult {
  ok: boolean;
  created?: LeaveRequestCreated;
  issues?: ValidationIssue[];
}

export interface ApiClient {
  listEmployees(): Promise<Employee[]>;
  getBalance(employeeId: string, year: number): Promise<BalanceResponse>;
  listRequests(employeeId: string): Promise<LeaveRequestListResponse>;
  createRequest(body: CreateLeaveRequestBody): Promise<CreateResult>;
}

export function createHttpClient(baseUrl = ""): ApiClient {
  async function getJson<T>(path: string): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`Anfrage fehlgeschlagen: ${response.status}`);
    }
    return (await response.json()) as T;
  }

  return {
    async listEmployees() {
      const data = await getJson<EmployeeListResponse>(API_ROUTES.employees);
      return data.employees;
    },
    getBalance(employeeId, year) {
      return getJson<BalanceResponse>(API_ROUTES.balance(employeeId, year));
    },
    listRequests(employeeId) {
      return getJson<LeaveRequestListResponse>(
        `${API_ROUTES.leaveRequests}?employeeId=${encodeURIComponent(employeeId)}`,
      );
    },
    async createRequest(body) {
      const response = await fetch(`${baseUrl}${API_ROUTES.leaveRequests}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as Record<string, unknown>;
      if (response.status === 201) {
        return { ok: true, created: payload as unknown as LeaveRequestCreated };
      }
      return { ok: false, issues: (payload.issues as ValidationIssue[] | undefined) ?? [] };
    },
  };
}
