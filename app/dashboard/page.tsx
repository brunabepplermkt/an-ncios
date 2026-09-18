import Link from "next/link";
import { FilterBar } from "@/components/FilterBar";
import { ModeBadges } from "@/components/ModeBadges";
import { Card, PageHeader, PlatformBadge, SeverityBadge, StatTile } from "@/components/ui";
import { getDashboardSummary } from "@/lib/data/campaigns";
import { getCreativeStats } from "@/lib/data/creatives";
import { getPlatformModes } from "@/lib/data/mode";
import type { PeriodKey } from "@/lib/data/period";
import { resolvePeriod } from "@/lib/data/period";
import { formatCurrency, formatNumber, formatPercent, formatRatio } from "@/lib/metrics/calc";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; platform?: string; start?: string; end?: string }>;
}) {
  const sp = await searchParams;
  const settings = await getSettings();
  const platform = (sp.platform as "META" | "GOOGLE" | "ALL") ?? "ALL";
  const periodKey = (sp.period as PeriodKey) ?? "30d";
  const period = resolvePeriod(periodKey, settings.timezone, sp.start, sp.end);

  const [summary, creativeStats, modes] = await Promise.all([
    getDashboardSummary(period, platform),
    getCreativeStats(7),
    getPlatformModes(),
  ]);

  const currency = settings.currency;
  const t = summary.totals;

  const bestCreatives = [...creativeStats]
    .filter((c) => c.totalRaw.impressions > 0)
    .sort((a, b) => (b.totalNormalized.ctr ?? 0) - (a.totalNormalized.ctr ?? 0))
    .slice(0, 4);

  const fatigued = creativeStats
    .filter((c) => (c.fatigueDropPct ?? 0) > 15)
    .sort((a, b) => (b.fatigueDropPct ?? 0) - (a.fatigueDropPct ?? 0))
    .slice(0, 4);

  const hasAnyCampaign = summary.totals.impressions > 0 || summary.topSpend.length > 0;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão unificada de investimento e performance em Meta e Google Ads."
        actions={<ModeBadges modes={modes} />}
      />

      <FilterBar basePath="/dashboard" currentPeriod={periodKey} currentPlatform={platform} customStart={sp.start} customEnd={sp.end} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Investimento total" value={formatCurrency(t.spend, currency)} />
        <StatTile label="Investimento Meta" value={formatCurrency(summary.metaTotals.spend, currency)} />
        <StatTile label="Investimento Google" value={formatCurrency(summary.googleTotals.spend, currency)} />
        <StatTile label="Impressões" value={formatNumber(t.impressions)} />
        <StatTile label="Alcance" value={formatNumber(t.reach)} sub={t.reach === undefined ? "Não disponível para todas as campanhas" : undefined} />
        <StatTile label="Cliques" value={formatNumber(t.clicks)} />
        <StatTile label="CTR" value={formatPercent(t.ctr)} />
        <StatTile label="CPC" value={formatCurrency(t.cpc, currency)} />
        <StatTile label="CPM" value={formatCurrency(t.cpm, currency)} />
        <StatTile label="Conversões" value={formatNumber(t.conversions)} />
        <StatTile label="CPA" value={formatCurrency(t.cpa, currency)} />
        <StatTile label="ROAS" value={formatRatio(t.roas)} sub={t.roas === undefined ? "Sem dados de receita" : undefined} />
      </div>

      {!hasAnyCampaign && (
        <Card className="mt-6 p-6">
          <p className="text-sm">
            Nenhuma campanha encontrada para este filtro. Assim que você conectar Meta/Google em{" "}
            <Link href="/integrations" className="text-accent underline">
              Integrações
            </Link>
            , seus dados reais aparecerão aqui automaticamente.
          </p>
        </Card>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Campanhas que mais gastaram</h2>
          <ul className="space-y-2">
            {summary.topSpend.map((c) => (
              <li key={c.id}>
                <Link href={`/campaigns/${c.id}`} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-surface-muted">
                  <span className="flex items-center gap-2 text-sm">
                    <PlatformBadge platform={c.platform} />
                    {c.name}
                  </span>
                  <span className="text-sm font-medium tabular-nums">{formatCurrency(c.raw.spend, currency)}</span>
                </Link>
              </li>
            ))}
            {summary.topSpend.length === 0 && <p className="px-2 py-2 text-sm text-muted">Sem dados no período.</p>}
          </ul>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Campanhas com melhores resultados</h2>
          <ul className="space-y-2">
            {summary.topPerformers.map((c) => (
              <li key={c.id}>
                <Link href={`/campaigns/${c.id}`} className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-surface-muted">
                  <span className="flex items-center gap-2 text-sm">
                    <PlatformBadge platform={c.platform} />
                    {c.name}
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {c.normalized.roas !== undefined ? `ROAS ${formatRatio(c.normalized.roas)}` : `${formatNumber(c.raw.conversions)} conv.`}
                  </span>
                </Link>
              </li>
            ))}
            {summary.topPerformers.length === 0 && <p className="px-2 py-2 text-sm text-muted">Sem conversões no período.</p>}
          </ul>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Campanhas que precisam de atenção</h2>
          <ul className="space-y-2">
            {summary.needsAttention.map((c) => (
              <li key={c.id} className="rounded-md px-2 py-2">
                <div className="flex items-center justify-between">
                  <Link href={`/campaigns/${c.id}`} className="flex items-center gap-2 text-sm hover:underline">
                    <PlatformBadge platform={c.platform} />
                    {c.name}
                  </Link>
                  <SeverityBadge severity="warning" />
                </div>
                <p className="mt-1 text-xs text-muted">{c.reason}</p>
              </li>
            ))}
            {summary.needsAttention.length === 0 && <p className="px-2 py-2 text-sm text-muted">Nenhum alerta neste período.</p>}
          </ul>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Criativos com melhor desempenho</h2>
          <ul className="space-y-2">
            {bestCreatives.map((c) => (
              <li key={c.creativeId} className="flex items-center justify-between rounded-md px-2 py-2">
                <span className="text-sm">{c.fileName}</span>
                <span className="text-sm font-medium tabular-nums">CTR {formatPercent(c.totalNormalized.ctr)}</span>
              </li>
            ))}
            {bestCreatives.length === 0 && <p className="px-2 py-2 text-sm text-muted">Sem veiculação suficiente ainda.</p>}
          </ul>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold">Possíveis sinais de fadiga de criativo</h2>
        {fatigued.length === 0 ? (
          <p className="px-2 py-2 text-sm text-muted">Nenhum sinal de fadiga nos últimos 7 dias.</p>
        ) : (
          <ul className="space-y-2">
            {fatigued.map((c) => (
              <li key={c.creativeId} className="flex items-center justify-between rounded-md px-2 py-2">
                <span className="text-sm">{c.fileName}</span>
                <span className="text-sm font-medium tabular-nums text-warning">
                  CTR caiu {c.fatigueDropPct!.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
