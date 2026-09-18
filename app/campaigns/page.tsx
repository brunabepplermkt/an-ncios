import Link from "next/link";
import { FilterBar } from "@/components/FilterBar";
import { ModeBadges } from "@/components/ModeBadges";
import { Card, PageHeader, PlatformBadge, StatusBadge } from "@/components/ui";
import { getCampaignsWithMetrics } from "@/lib/data/campaigns";
import { getPlatformModes } from "@/lib/data/mode";
import type { PeriodKey } from "@/lib/data/period";
import { resolvePeriod } from "@/lib/data/period";
import { formatCurrency, formatNumber, formatPercent, formatRatio } from "@/lib/metrics/calc";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type SortKey = "spend" | "conversions" | "ctr" | "cpa" | "name";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; platform?: string; q?: string; sort?: string; start?: string; end?: string }>;
}) {
  const sp = await searchParams;
  const settings = await getSettings();
  const periodKey = (sp.period as PeriodKey) ?? "30d";
  const platform = (sp.platform as "META" | "GOOGLE" | "ALL") ?? "ALL";
  const search = (sp.q ?? "").toLowerCase();
  const sort = (sp.sort as SortKey) ?? "spend";
  const period = resolvePeriod(periodKey, settings.timezone, sp.start, sp.end);

  const [campaigns, modes] = await Promise.all([getCampaignsWithMetrics(period, platform), getPlatformModes()]);

  const filtered = campaigns.filter((c) => c.name.toLowerCase().includes(search));
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "conversions":
        return b.raw.conversions - a.raw.conversions;
      case "ctr":
        return (b.normalized.ctr ?? 0) - (a.normalized.ctr ?? 0);
      case "cpa":
        return (a.normalized.cpa ?? Infinity) - (b.normalized.cpa ?? Infinity);
      case "spend":
      default:
        return b.raw.spend - a.raw.spend;
    }
  });

  function sortHref(key: SortKey) {
    const params = new URLSearchParams({ period: periodKey, platform, q: sp.q ?? "", sort: key, start: sp.start ?? "", end: sp.end ?? "" });
    return `/campaigns?${params.toString()}`;
  }

  return (
    <div>
      <PageHeader title="Campanhas" description="Todas as campanhas, Meta e Google, lado a lado." actions={<ModeBadges modes={modes} />} />
      <FilterBar
        basePath="/campaigns"
        currentPeriod={periodKey}
        currentPlatform={platform}
        customStart={sp.start}
        customEnd={sp.end}
        extraParams={{ q: sp.q ?? "", sort }}
      />

      <form action="/campaigns" method="get" className="mb-4 flex gap-2">
        <input type="hidden" name="period" value={periodKey} />
        <input type="hidden" name="platform" value={platform} />
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="start" value={sp.start ?? ""} />
        <input type="hidden" name="end" value={sp.end ?? ""} />
        <input
          type="search"
          name="q"
          defaultValue={sp.q}
          placeholder="Buscar campanha por nome..."
          className="w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="px-4 py-3 font-medium">Plataforma</th>
              <th className="px-4 py-3 font-medium">
                <Link href={sortHref("name")} className="hover:text-foreground">
                  Nome
                </Link>
              </th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Orçamento/dia</th>
              <th className="px-4 py-3 text-right font-medium">
                <Link href={sortHref("spend")} className="hover:text-foreground">
                  Gasto
                </Link>
              </th>
              <th className="px-4 py-3 text-right font-medium">Impressões</th>
              <th className="px-4 py-3 text-right font-medium">Cliques</th>
              <th className="px-4 py-3 text-right font-medium">
                <Link href={sortHref("ctr")} className="hover:text-foreground">
                  CTR
                </Link>
              </th>
              <th className="px-4 py-3 text-right font-medium">CPC</th>
              <th className="px-4 py-3 text-right font-medium">
                <Link href={sortHref("conversions")} className="hover:text-foreground">
                  Conv.
                </Link>
              </th>
              <th className="px-4 py-3 text-right font-medium">
                <Link href={sortHref("cpa")} className="hover:text-foreground">
                  CPA
                </Link>
              </th>
              <th className="px-4 py-3 text-right font-medium">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <PlatformBadge platform={c.platform} />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/campaigns/${c.id}`} className="font-medium hover:text-accent">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.dailyBudget ?? undefined, settings.currency)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.raw.spend, settings.currency)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatNumber(c.raw.impressions)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatNumber(c.raw.clicks)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatPercent(c.normalized.ctr)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.normalized.cpc, settings.currency)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatNumber(c.raw.conversions)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(c.normalized.cpa, settings.currency)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatRatio(c.normalized.roas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <p className="p-6 text-center text-sm text-muted">Nenhuma campanha encontrada.</p>}
      </Card>
    </div>
  );
}
