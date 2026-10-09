import {
  findTeamCoverageConflicts,
  TEAM_COVERAGE_THRESHOLD,
  validateLeaveRequest,
  type Employee,
  type LeaveRequest,
} from "../src/index.js";
import { employee, request } from "./fixtures.js";

const TODAY = "2026-06-15";

/** Vier Vollzeitkraefte in Bremen, damit im Juni kein Feiertag stoert. */
function team(size: number): Employee[] {
  return Array.from({ length: size }, (_person, index) =>
    employee({
      id: `emp-${index + 1}`,
      name: `Person ${index + 1}`,
      team: "Plattform",
      bundesland: "HB",
    }),
  );
}

function absence(employeeId: string, from: string, to: string): LeaveRequest {
  return request({ id: `req-${employeeId}`, employeeId, from, to, status: "approved" });
}

describe("Regel 10: Warnung bei duenner Teambesetzung", () => {
  test("die Schwelle liegt bei der Haelfte des Teams", () => {
    expect(TEAM_COVERAGE_THRESHOLD).toBe(0.5);
  });

  const CASES: readonly [string, number, number, boolean][] = [
    ["allein im Vierer-Team", 4, 0, false],
    ["zwei von vier abwesend", 4, 1, false],
    ["drei von vier abwesend", 4, 2, true],
    ["zwei von drei abwesend", 3, 1, true],
    ["zwei von zwei abwesend", 2, 1, true],
  ];

  test.each(CASES)("%s warnt: %s", (_name, teamSize, colleaguesAway, expected) => {
    const members = team(teamSize);
    const applicant = members[0];
    const requests = members
      .slice(1, 1 + colleaguesAway)
      .map((colleague) => absence(colleague.id, "2026-06-22", "2026-06-26"));

    const conflicts = findTeamCoverageConflicts(
      { from: "2026-06-22", to: "2026-06-26" },
      applicant,
      members,
      requests,
    );
    expect(conflicts.length > 0).toBe(expected);
  });

  test("nur ueberlappende Tage werden gemeldet", () => {
    const members = team(3);
    const applicant = members[0];
    const requests = [
      absence("emp-2", "2026-06-22", "2026-06-23"),
      absence("emp-3", "2026-06-22", "2026-06-23"),
    ];

    const conflicts = findTeamCoverageConflicts(
      { from: "2026-06-22", to: "2026-06-26" },
      applicant,
      members,
      requests,
    );
    expect(conflicts.map((conflict) => conflict.date)).toEqual(["2026-06-22", "2026-06-23"]);
  });

  test("Kollegen aus anderen Teams zaehlen nicht", () => {
    const members = team(2);
    const applicant = members[0];
    const other = employee({ id: "emp-x", team: "Kundenportal", bundesland: "HB" });
    const requests = [absence("emp-x", "2026-06-22", "2026-06-26")];

    const conflicts = findTeamCoverageConflicts(
      { from: "2026-06-22", to: "2026-06-26" },
      applicant,
      [...members, other],
      requests,
    );
    expect(conflicts).toEqual([]);
  });

  test("die Ueberschneidung ist eine Warnung und keine Ablehnung", () => {
    const members = team(2);
    const applicant = members[0];
    const requests = [absence("emp-2", "2026-06-22", "2026-06-26")];

    const result = validateLeaveRequest(
      { from: "2026-06-22", to: "2026-06-26" },
      { employee: applicant, employees: members, requests, today: TODAY },
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings.map((issue) => issue.code)).toContain("TEAM_COVERAGE");
  });
});
