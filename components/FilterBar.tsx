import Link from "next/link";
import { clsx } from "clsx";
import type { PeriodKey } from "@/lib/data/period";

const PERIOD_OPTIONS: Array<{ key: PeriodKey; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "7 dias" },
  { key: "14d", label: "14 dias" },
  { key: "30d", label: "30 dias" },
  { key: "this_month", label: "Este mês" },
  { key: "last_month", label: "Mês passado" },
];

export function FilterBar({
  basePath,
  currentPeriod,
  currentPlatform,
  customStart,
  customEnd,
  extraParams = {},
}: {
  basePath: string;
  currentPeriod: PeriodKey;
  currentPlatform: "META" | "GOOGLE" | "ALL";
  customStart?: string;
  customEnd?: string;
  extraParams?: Record<string, string>;
}) {
  function hrefFor(overrides: Record<string, string>) {
    const params = new URLSearchParams({ period: currentPeriod, platform: currentPlatform, ...extraParams, ...overrides });
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1">
        {PERIOD_OPTIONS.map((opt) => (
          <Link
            key={opt.key}
            href={hrefFor({ period: opt.key })}
            className={clsx(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              currentPeriod === opt.key ? "bg-accent text-accent-foreground font-medium" : "text-muted hover:text-foreground"
            )}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      <form action={basePath} method="get" className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
        <input type="hidden" name="platform" value={currentPlatform} />
        <input type="hidden" name="period" value="custom" />
        <input
          type="date"
          name="start"
          defaultValue={customStart}
          className="rounded-md bg-transparent px-2 py-1 text-sm outline-none"
          aria-label="Data inicial"
        />
        <span className="text-xs text-muted">até</span>
        <input
          type="date"
          name="end"
          defaultValue={customEnd}
          className="rounded-md bg-transparent px-2 py-1 text-sm outline-none"
          aria-label="Data final"
        />
        <button
          type="submit"
          className={clsx(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            currentPeriod === "custom" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
          )}
        >
          Aplicar
        </button>
      </form>

      <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
        {(["ALL", "META", "GOOGLE"] as const).map((p) => (
          <Link
            key={p}
            href={hrefFor({ platform: p })}
            className={clsx(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              currentPlatform === p ? "bg-accent text-accent-foreground font-medium" : "text-muted hover:text-foreground"
            )}
          >
            {p === "ALL" ? "Todas" : p === "META" ? "Meta" : "Google"}
          </Link>
        ))}
      </div>
    </div>
  );
}
