import { API_ROUTES } from "../src/index.js";

/**
 * Die Routen sind der einzige Laufzeitanteil dieses Pakets. Wenn sie sich
 * aendern, muessen API und Web gemeinsam angefasst werden.
 */
describe("API_ROUTES", () => {
  const CASES: readonly [string, string][] = [
    [API_ROUTES.health, "/health"],
    [API_ROUTES.employees, "/api/employees"],
    [API_ROUTES.employee("emp-001"), "/api/employees/emp-001"],
    [API_ROUTES.balance("emp-001", 2026), "/api/employees/emp-001/balance?year=2026"],
    [API_ROUTES.holidays("NW", 2026), "/api/holidays/NW/2026"],
    [API_ROUTES.leaveRequests, "/api/leave-requests"],
    [API_ROUTES.approve("req-1"), "/api/leave-requests/req-1/approve"],
    [API_ROUTES.cancel("req-1"), "/api/leave-requests/req-1/cancel"],
  ];

  test.each(CASES)("%s", (actual, expected) => {
    expect(actual).toBe(expected);
  });
});
