import type { IsoDate } from "@urlaub/holidays";
import { listLeaveDays } from "./leave-days.js";
import { isBlocking, type Employee, type LeaveRequest, type LeaveSpan } from "./types.js";
import { isWorkday } from "./workdays.js";

/** Ab wie viel Abwesenheit im Team gewarnt wird. */
export const TEAM_COVERAGE_THRESHOLD = 0.5;

export interface TeamCoverageConflict {
  date: IsoDate;
  team: string;
  teamSize: number;
  absent: number;
  ratio: number;
}

function coversDay(request: LeaveRequest, day: IsoDate): boolean {
  return request.from <= day && day <= request.to;
}

/**
 * Tage, an denen mehr als die Haelfte des Teams abwesend waere, wenn der
 * Antrag genehmigt wird. Das Ergebnis ist eine Warnung, keine Ablehnung.
 */
export function findTeamCoverageConflicts(
  span: LeaveSpan,
  applicant: Employee,
  employees: readonly Employee[],
  requests: readonly LeaveRequest[],
  options: { ignoreRequestIds?: readonly string[] } = {},
): TeamCoverageConflict[] {
  const ignored = new Set(options.ignoreRequestIds ?? []);
  const team = employees.filter((employee) => employee.team === applicant.team);
  if (team.length === 0) {
    return [];
  }

  const byEmployee = new Map<string, Employee>(team.map((employee) => [employee.id, employee]));
  const relevant = requests.filter(
    (request) =>
      !ignored.has(request.id) &&
      isBlocking(request) &&
      request.employeeId !== applicant.id &&
      byEmployee.has(request.employeeId),
  );

  const conflicts: TeamCoverageConflict[] = [];
  for (const day of listLeaveDays(span, applicant)) {
    const absentIds = new Set<string>([applicant.id]);
    for (const request of relevant) {
      if (!coversDay(request, day)) {
        continue;
      }
      const colleague = byEmployee.get(request.employeeId);
      if (colleague && isWorkday(day, colleague.workdays, colleague.bundesland)) {
        absentIds.add(colleague.id);
      }
    }

    const ratio = absentIds.size / team.length;
    if (ratio > TEAM_COVERAGE_THRESHOLD) {
      conflicts.push({
        date: day,
        team: applicant.team,
        teamSize: team.length,
        absent: absentIds.size,
        ratio,
      });
    }
  }

  return conflicts;
}
