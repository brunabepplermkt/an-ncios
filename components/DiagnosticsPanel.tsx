"use client";

import { useState } from "react";
import { formatCurrency, formatNumber, formatPercent, formatRatio } from "@/lib/metrics/calc";

interface CampaignOption {
  id: string;
  name: string;
  platform: "META" | "GOOGLE";
}

const FIELD_LABEL: Record<string, string> = {
  impressions: "Impressões",
  clicks: "Cliques",
  spend: "Gasto",
  conversions: "Conversões",
  reach: "Alcance",
  revenue: "Receita",
  frequency: "Frequência",
  ctr: "CTR",
  cpc: "CPC",
  cpm: "CPM",
  cpa: "CPA",
  roas: "ROAS",
};

function formatByField(field: string, value: number | undefined): string {
  if (value === undefined) return "—";
  if (["spend", "revenue", "cpc", "cpm", "cpa"].includes(field)) return formatCurrency(value);
  if (["ctr"].includes(field)) return formatPercent(value);
  if (field === "roas") return formatRatio(value);
  return formatNumber(value, 2);
}

export function DiagnosticsPanel({ campaigns }: { campaigns: CampaignOption[] }) {
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- diagnostics payload shape mirrors the API route's ad-hoc response
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao rodar diagnóstico.");
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  if (campaigns.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
        Nenhuma campanha real importada ainda. Sincronize Meta ou Google em Integrações para poder validar números aqui.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-muted">Campanha</span>
          <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.platform}] {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-muted">Data</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-border bg-surface px-3 py-2 text-sm" />
        </label>
        <button onClick={run} disabled={loading} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50">
          {loading ? "Verificando..." : "Validar"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-critical">{error}</p>}

      {result && (
        <div className="mt-5 space-y-5">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Valores brutos armazenados {result.hasStoredRow ? "" : "(nenhuma linha para esta data)"}
              {result.live && " vs. buscados ao vivo agora"}
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-1.5">Campo</th>
                  <th className="py-1.5 text-right">Armazenado</th>
                  {result.live && <th className="py-1.5 text-right">Ao vivo</th>}
                  {result.live && <th className="py-1.5 text-right">Confere?</th>}
                </tr>
              </thead>
              <tbody>
                {(result.rawComparison ?? Object.keys(result.storedRaw).map((field: string) => ({ field, stored: result.storedRaw[field], live: undefined, match: true }))).map(
                  (row: { field: string; stored?: number; live?: number; match: boolean }) => (
                    <tr key={row.field} className="border-b border-border last:border-0">
                      <td className="py-1.5">{FIELD_LABEL[row.field] ?? row.field}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatByField(row.field, row.stored)}</td>
                      {result.live && <td className="py-1.5 text-right tabular-nums">{formatByField(row.field, row.live)}</td>}
                      {result.live && <td className={`py-1.5 text-right ${row.match ? "text-success" : "text-critical"}`}>{row.match ? "✓" : "✗"}</td>}
                    </tr>
                  )
                )}
              </tbody>
            </table>
            {result.liveError && <p className="mt-2 text-xs text-muted">Sem valor ao vivo: {result.liveError}</p>}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Cálculo oficial (lib/metrics/calc.ts) vs. recálculo independente
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="py-1.5">Métrica</th>
                  <th className="py-1.5 text-right">Oficial</th>
                  <th className="py-1.5 text-right">Independente</th>
                  <th className="py-1.5 text-right">Confere?</th>
                </tr>
              </thead>
              <tbody>
                {result.normalizedComparison.map((row: { field: string; official?: number; independent?: number; match: boolean }) => (
                  <tr key={row.field} className="border-b border-border last:border-0">
                    <td className="py-1.5">{FIELD_LABEL[row.field] ?? row.field}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatByField(row.field, row.official)}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatByField(row.field, row.independent)}</td>
                    <td className={`py-1.5 text-right ${row.match ? "text-success" : "text-critical"}`}>{row.match ? "✓" : "✗"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
