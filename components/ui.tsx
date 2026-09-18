import { clsx } from "clsx";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("rounded-lg border border-border bg-surface", className)}>{children}</div>;
}

export function DemoBadge({ label = "DADOS DEMO" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-demo-bg px-2.5 py-1 text-xs font-medium text-demo">
      <span className="h-1.5 w-1.5 rounded-full bg-demo" />
      {label}
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: "META" | "GOOGLE" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        platform === "META" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      )}
    >
      {platform === "META" ? "Meta" : "Google"}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const tone =
    s === "ACTIVE" ? "success" : s === "PAUSED" ? "warning" : s === "ERROR" ? "critical" : "muted";
  const toneClass =
    tone === "success"
      ? "bg-success-bg text-success"
      : tone === "warning"
      ? "bg-warning-bg text-warning"
      : tone === "critical"
      ? "bg-critical-bg text-critical"
      : "bg-surface-muted text-muted";
  const label = s === "ACTIVE" ? "Ativa" : s === "PAUSED" ? "Pausada" : status;
  return <span className={clsx("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", toneClass)}>{label}</span>;
}

export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <Card className="p-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </Card>
  );
}

export function SeverityBadge({ severity }: { severity: "info" | "warning" | "critical" }) {
  const toneClass =
    severity === "critical"
      ? "bg-critical-bg text-critical"
      : severity === "warning"
      ? "bg-warning-bg text-warning"
      : "bg-surface-muted text-muted";
  const label = severity === "critical" ? "Crítico" : severity === "warning" ? "Atenção" : "Info";
  return <span className={clsx("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", toneClass)}>{label}</span>;
}
