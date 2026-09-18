import { prisma } from "@/lib/db";
import { normalizeMetrics, sumRawMetrics } from "@/lib/metrics/calc";
import type { NormalizedMetrics, RawMetrics } from "@/lib/metrics/types";
import type { Period } from "./period";
import { previousPeriod } from "./period";

export type PlatformFilter = "META" | "GOOGLE" | "ALL";

export interface CampaignWithMetrics {
  id: string;
  platform: "META" | "GOOGLE";
  name: string;
  status: string;
  objective: string | null;
  dailyBudget: number | null;
  raw: RawMetrics;
  normalized: NormalizedMetrics;
}

async function sumMetricsForCampaigns(campaignIds: string[], period: Period) {
  if (campaignIds.length === 0) return new Map<string, RawMetrics>();
  const rows = await prisma.campaignMetricDaily.groupBy({
    by: ["campaignId"],
    where: { campaignId: { in: campaignIds }, date: { gte: period.start, lte: period.end } },
    _sum: { impressions: true, reach: true, clicks: true, spend: true, conversions: true, revenue: true },
  });
  const map = new Map<string, RawMetrics>();
  for (const row of rows) {
    map.set(row.campaignId, {
      impressions: row._sum.impressions ?? 0,
      reach: row._sum.reach ?? undefined,
      clicks: row._sum.clicks ?? 0,
      spend: row._sum.spend ?? 0,
      conversions: row._sum.conversions ?? 0,
      revenue: row._sum.revenue ?? undefined,
    });
  }
  return map;
}

export async function getCampaignsWithMetrics(
  period: Period,
  platform: PlatformFilter = "ALL"
): Promise<CampaignWithMetrics[]> {
  const campaigns = await prisma.campaign.findMany({
    where: platform === "ALL" ? {} : { platform },
    orderBy: { createdAt: "asc" },
  });
  const sums = await sumMetricsForCampaigns(campaigns.map((c) => c.id), period);

  return campaigns.map((c) => {
    const raw = sums.get(c.id) ?? { impressions: 0, clicks: 0, spend: 0, conversions: 0 };
    return {
      id: c.id,
      platform: c.platform,
      name: c.name,
      status: c.status,
      objective: c.objective,
      dailyBudget: c.dailyBudget,
      raw,
      normalized: normalizeMetrics(raw),
    };
  });
}

export interface DashboardSummary {
  totals: NormalizedMetrics;
  metaTotals: NormalizedMetrics;
  googleTotals: NormalizedMetrics;
  topSpend: CampaignWithMetrics[];
  topPerformers: CampaignWithMetrics[];
  needsAttention: Array<CampaignWithMetrics & { reason: string }>;
}

export async function getDashboardSummary(period: Period, platform: PlatformFilter = "ALL"): Promise<DashboardSummary> {
  const campaigns = await getCampaignsWithMetrics(period, platform);
  const metaCampaigns = campaigns.filter((c) => c.platform === "META");
  const googleCampaigns = campaigns.filter((c) => c.platform === "GOOGLE");

  const totals = normalizeMetrics(sumRawMetrics(campaigns.map((c) => c.raw)));
  const metaTotals = normalizeMetrics(sumRawMetrics(metaCampaigns.map((c) => c.raw)));
  const googleTotals = normalizeMetrics(sumRawMetrics(googleCampaigns.map((c) => c.raw)));

  const topSpend = [...campaigns].sort((a, b) => b.raw.spend - a.raw.spend).slice(0, 5);
  const topPerformers = [...campaigns]
    .filter((c) => c.raw.conversions > 0)
    .sort((a, b) => (b.normalized.roas ?? b.raw.conversions) - (a.normalized.roas ?? a.raw.conversions))
    .slice(0, 5);

  const prev = previousPeriod(period);
  const prevCampaigns = await getCampaignsWithMetrics(prev, platform);
  const prevById = new Map(prevCampaigns.map((c) => [c.id, c]));

  const needsAttention: Array<CampaignWithMetrics & { reason: string }> = [];
  for (const c of campaigns) {
    if (c.raw.spend < 5) continue; // ignore near-zero spend noise
    const prevC = prevById.get(c.id);
    const reasons: string[] = [];
    if (c.normalized.cpa !== undefined && prevC?.normalized.cpa !== undefined) {
      const delta = (c.normalized.cpa - prevC.normalized.cpa) / prevC.normalized.cpa;
      if (delta > 0.2) reasons.push(`CPA subiu ${(delta * 100).toFixed(0)}% vs. período anterior`);
    }
    if (c.normalized.ctr !== undefined && prevC?.normalized.ctr !== undefined) {
      const delta = (c.normalized.ctr - prevC.normalized.ctr) / prevC.normalized.ctr;
      if (delta < -0.2) reasons.push(`CTR caiu ${Math.abs(delta * 100).toFixed(0)}% vs. período anterior`);
    }
    if (c.normalized.frequency !== undefined && c.normalized.frequency > 3.5) {
      reasons.push(`Frequência alta (${c.normalized.frequency.toFixed(1)}x)`);
    }
    if (reasons.length > 0) needsAttention.push({ ...c, reason: reasons.join(" · ") });
  }

  return { totals, metaTotals, googleTotals, topSpend, topPerformers, needsAttention: needsAttention.slice(0, 6) };
}

export interface CampaignDetail extends CampaignWithMetrics {
  series: Array<{ date: string; raw: RawMetrics; normalized: NormalizedMetrics }>;
  creatives: Array<{ id: string; fileName: string; kind: string; storageKey: string }>;
}

export async function getCampaignDetail(id: string, period: Period): Promise<CampaignDetail | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      metricsDaily: { where: { date: { gte: period.start, lte: period.end } }, orderBy: { date: "asc" } },
      creatives: { include: { creative: true } },
    },
  });
  if (!campaign) return null;

  const series = campaign.metricsDaily.map((m) => {
    const raw: RawMetrics = {
      impressions: m.impressions,
      reach: m.reach ?? undefined,
      clicks: m.clicks,
      spend: m.spend,
      conversions: m.conversions,
      revenue: m.revenue ?? undefined,
      frequency: m.frequency ?? undefined,
    };
    return { date: m.date.toISOString().slice(0, 10), raw, normalized: normalizeMetrics(raw) };
  });

  const raw = sumRawMetrics(series.map((s) => s.raw));

  return {
    id: campaign.id,
    platform: campaign.platform,
    name: campaign.name,
    status: campaign.status,
    objective: campaign.objective,
    dailyBudget: campaign.dailyBudget,
    raw,
    normalized: normalizeMetrics(raw),
    series,
    creatives: campaign.creatives.map((cc) => ({
      id: cc.creative.id,
      fileName: cc.creative.fileName,
      kind: cc.creative.kind,
      storageKey: cc.creative.storageKey,
    })),
  };
}
