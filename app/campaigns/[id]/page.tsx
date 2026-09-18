import Link from "next/link";
import { notFound } from "next/navigation";
import { LineChart } from "@/components/LineChart";
import { Card, DemoBadge, PageHeader, PlatformBadge, StatTile, StatusBadge } from "@/components/ui";
import { getCampaignDetail } from "@/lib/data/campaigns";
import type { PeriodKey } from "@/lib/data/period";
import { resolvePeriod } from "@/lib/data/period";
import { formatCurrency, formatNumber, formatPercent, formatRatio } from "@/lib/metrics/calc";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const periodKey = (sp.period as PeriodKey) ?? "30d";
  const period = resolvePeriod(periodKey);

  const [campaign, settings] = await Promise.all([getCampaignDetail(id, period), getSettings()]);
  if (!campaign) notFound();

  const spendSeries = campaign.series.map((s) => ({ label: s.date, value: s.raw.spend }));
  const ctrSeries = campaign.series.map((s) => ({ label: s.date, value: s.normalized.ctr ?? 0 }));

  return (
    <div>
      <Link href="/campaigns" className="text-sm text-muted hover:text-foreground">
        ← Campanhas
      </Link>
      <PageHeader
        title={campaign.name}
        description={campaign.objective ?? undefined}
        actions={
          <>
            <PlatformBadge platform={campaign.platform} />
            <StatusBadge status={campaign.status} />
            {campaign.isDemo && <DemoBadge />}
          </>
        }
      />

      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit">
        {(["7d", "14d", "30d"] as PeriodKey[]).map((p) => (
          <Link
            key={p}
            href={`/campaigns/${id}?period=${p}`}
            className={`rounded-md px-3 py-1.5 text-sm ${p === periodKey ? "bg-accent text-accent-foreground font-medium" : "text-muted hover:text-foreground"}`}
          >
            {p === "7d" ? "7 dias" : p === "14d" ? "14 dias" : "30 dias"}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Gasto" value={formatCurrency(campaign.raw.spend, settings.currency)} />
        <StatTile label="Impressões" value={formatNumber(campaign.raw.impressions)} />
        <StatTile label="Cliques" value={formatNumber(campaign.raw.clicks)} />
        <StatTile label="CTR" value={formatPercent(campaign.normalized.ctr)} />
        <StatTile label="CPC" value={formatCurrency(campaign.normalized.cpc, settings.currency)} />
        <StatTile label="Conversões" value={formatNumber(campaign.raw.conversions)} />
        <StatTile label="CPA" value={formatCurrency(campaign.normalized.cpa, settings.currency)} />
        <StatTile label="ROAS" value={formatRatio(campaign.normalized.roas)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Gasto por dia</h2>
          <LineChart points={spendSeries} color="var(--accent)" format={(v) => formatCurrency(v, settings.currency)} />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">CTR por dia</h2>
          <LineChart points={ctrSeries} color="var(--success)" format={(v) => formatPercent(v)} />
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <h2 className="mb-3 text-sm font-semibold">Criativos utilizados</h2>
        {campaign.creatives.length === 0 ? (
          <p className="text-sm text-muted">Nenhum criativo vinculado a esta campanha ainda.</p>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {campaign.creatives.map((c) => (
              <li key={c.id}>
                <Link href="/creatives" className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-muted">
                  <span className={`h-2 w-2 rounded-full ${c.kind === "VIDEO" ? "bg-purple-500" : "bg-blue-500"}`} />
                  {c.fileName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
