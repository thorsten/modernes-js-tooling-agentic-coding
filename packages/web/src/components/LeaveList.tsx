import type { LeaveRequest, LeaveStatus } from "@urlaub/shared-types";

const STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "offen",
  approved: "genehmigt",
  rejected: "abgelehnt",
  cancelled: "storniert",
};

export interface LeaveListProps {
  requests: LeaveRequest[];
}

export function LeaveList({ requests }: LeaveListProps) {
  if (requests.length === 0) {
    return (
      <section aria-label="Anträge" className="card">
        <h2 className="card-title">Anträge</h2>
        <p className="card-empty" data-testid="empty-list">
          Noch keine Anträge erfasst.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <table className="leave-table">
        <caption>Anträge</caption>
        <thead>
          <tr>
            <th scope="col">Von</th>
            <th scope="col">Bis</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} data-testid="leave-row">
              <td>{request.from}</td>
              <td>{request.to}</td>
              <td>
                <span className="status" data-status={request.status}>
                  {STATUS_LABELS[request.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
