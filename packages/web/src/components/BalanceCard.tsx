import type { LeaveBalance } from "@urlaub/shared-types";

export interface BalanceCardProps {
  balance: LeaveBalance | null;
}

interface Metric {
  label: string;
  value: number;
  testId: string;
  emphasis?: boolean;
}

export function BalanceCard({ balance }: BalanceCardProps) {
  if (!balance) {
    return (
      <section aria-label="Urlaubskonto" className="card">
        <p className="card-empty">Kein Konto geladen.</p>
      </section>
    );
  }

  const metrics: Metric[] = [
    { label: "Jahresanspruch", value: balance.annual, testId: "annual" },
    { label: "Übertrag nutzbar", value: balance.carriedOverAvailable, testId: "carry" },
    { label: "Verbraucht", value: balance.used, testId: "used" },
    { label: "Rest", value: balance.remaining, testId: "remaining", emphasis: true },
  ];

  return (
    <section aria-label="Urlaubskonto" className="card">
      <h2 className="card-title">Urlaubskonto {balance.year}</h2>
      <dl className="balance-grid">
        {metrics.map((metric) => (
          <div
            key={metric.testId}
            className="balance-cell"
            data-emphasis={metric.emphasis === true}
          >
            <dt>{metric.label}</dt>
            <dd data-testid={metric.testId}>{metric.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
