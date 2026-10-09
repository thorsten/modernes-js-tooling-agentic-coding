import { useState } from "react";
import type { ValidationIssue } from "@urlaub/shared-types";

export interface LeaveRequestFormProps {
  employeeId: string;
  issues: ValidationIssue[];
  busy?: boolean;
  onSubmit: (values: { from: string; to: string; halfDay?: "AM" | "PM" }) => void;
}

export function LeaveRequestForm({ employeeId, issues, busy, onSubmit }: LeaveRequestFormProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [halfDay, setHalfDay] = useState("");

  return (
    <form
      aria-label="Urlaub beantragen"
      className="card"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          from,
          to,
          halfDay: halfDay === "AM" || halfDay === "PM" ? halfDay : undefined,
        });
      }}
    >
      <h2 className="card-title">Urlaub beantragen</h2>
      <input type="hidden" name="employeeId" value={employeeId} />

      <div className="field-row">
        <div className="field">
          <label htmlFor="from">Von</label>
          <input
            id="from"
            name="from"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="to">Bis</label>
          <input
            id="to"
            name="to"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="halfDay">Halber Tag</label>
        <select
          id="halfDay"
          name="halfDay"
          value={halfDay}
          onChange={(event) => setHalfDay(event.target.value)}
        >
          <option value="">ganzer Tag</option>
          <option value="AM">vormittags</option>
          <option value="PM">nachmittags</option>
        </select>
      </div>

      <button type="submit" disabled={busy}>
        Antrag senden
      </button>

      {issues.length > 0 && (
        <ul aria-label="Fehler" className="issues" data-testid="issues">
          {issues.map((issue) => (
            <li key={issue.code}>{issue.message}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
