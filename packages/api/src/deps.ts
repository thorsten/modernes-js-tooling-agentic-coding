/**
 * Ein Ort fuer alles, was die API aus der Fachlogik zieht.
 */
export {
  BUNDESLAENDER,
  canCancel,
  cancelLeaveRequest,
  computeBalance,
  getHolidays,
  isBundesland,
  validateLeaveRequest,
  type Employee,
  type LeaveBalance,
  type LeaveRequest,
  type LeaveSpan,
} from "@urlaub/core-rules";

export function toIsoDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}
