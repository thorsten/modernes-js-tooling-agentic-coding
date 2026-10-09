/**
 * Vertrag zwischen API und Web-Oberflaeche. Die Domaenentypen kommen aus
 * core-rules und werden hier nur durchgereicht, damit das Frontend keine
 * Fachlogik einbinden muss.
 */
export type {
  Bundesland,
  Employee,
  Holiday,
  IsoDate,
  LeaveBalance,
  LeaveRequest,
  LeaveStatus,
  TeamCoverageConflict,
  ValidationCode,
  ValidationIssue,
  Weekday,
} from "@urlaub/core-rules";

import type {
  Employee,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  ValidationIssue,
} from "@urlaub/core-rules";

export interface CreateLeaveRequestBody {
  employeeId: string;
  from: string;
  to: string;
  halfDay?: "AM" | "PM";
}

export interface LeaveRequestCreated {
  request: LeaveRequest;
  days: number;
  warnings: ValidationIssue[];
}

export interface LeaveRequestRejected {
  error: "VALIDATION_FAILED";
  issues: ValidationIssue[];
}

export interface EmployeeListResponse {
  employees: Employee[];
}

export interface LeaveRequestListResponse {
  requests: LeaveRequest[];
}

export interface BalanceResponse {
  employeeId: string;
  balance: LeaveBalance;
}

export interface HolidayListResponse {
  bundesland: string;
  year: number;
  holidays: Holiday[];
}

export interface ApiError {
  error: string;
  message: string;
}

export const API_ROUTES = {
  health: "/health",
  employees: "/api/employees",
  employee: (id: string) => `/api/employees/${id}`,
  balance: (id: string, year: number) => `/api/employees/${id}/balance?year=${year}`,
  holidays: (bundesland: string, year: number) => `/api/holidays/${bundesland}/${year}`,
  leaveRequests: "/api/leave-requests",
  approve: (id: string) => `/api/leave-requests/${id}/approve`,
  cancel: (id: string) => `/api/leave-requests/${id}/cancel`,
} as const;
