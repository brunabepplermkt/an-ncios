import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { compareNormalized, compareRawMetrics, independentRecompute } from "@/lib/diagnostics";
import { normalizeMetrics } from "@/lib/metrics/calc";
import type { RawMetrics } from "@/lib/metrics/types";
import { getIntegration } from "@/lib/integrations";

export async function POST(req: Request) {
  const body = await req.json();
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId : "";
  const dateStr = typeof body?.date === "string" ? body.date : "";

  if (!campaignId || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "campaignId e date (YYYY-MM-DD) são obrigatórios." }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  if (campaign.isDemo) return NextResponse.json({ error: "Diagnóstico é apenas para campanhas reais importadas." }, { status: 400 });
  if (!campaign.externalId) return NextResponse.json({ error: "Campanha sem externalId." }, { status: 400 });

  const date = new Date(`${dateStr}T00:00:00.000Z`);
  const metricRow = await prisma.campaignMetricDaily.findUnique({ where: { campaignId_date: { campaignId, date } } });

  const storedRaw: RawMetrics = metricRow
    ? {
        impressions: metricRow.impressions,
        reach: metricRow.reach ?? undefined,
        clicks: metricRow.clicks,
        spend: metricRow.spend,
        conversions: metricRow.conversions,
        revenue: metricRow.revenue ?? undefined,
        frequency: metricRow.frequency ?? undefined,
      }
    : { impressions: 0, clicks: 0, spend: 0, conversions: 0 };

  const officialNormalized = normalizeMetrics(storedRaw);
  const independent = independentRecompute(storedRaw);
  const normalizedComparison = compareNormalized(officialNormalized, independent);

  let live: RawMetrics | null = null;
  let liveError: string | null = null;
  try {
    const integration = await getIntegration(campaign.platform);
    if (!integration?.accountId) {
      liveError = "Nenhuma conta conectada para buscar o valor ao vivo.";
    } else if (campaign.platform === "META") {
      const { metaReadAdapter } = await import("@/lib/adapters/meta/read-adapter");
      const row = await metaReadAdapter.getInsightsForDate(campaign.externalId, dateStr);
      live = row ? { impressions: row.impressions, reach: row.reach, clicks: row.clicks, spend: row.spend, conversions: row.conversions, revenue: row.revenue, frequency: row.frequency } : { impressions: 0, clicks: 0, spend: 0, conversions: 0 };
    } else {
      const { googleReadAdapter } = await import("@/lib/adapters/google/read-adapter");
      const row = await googleReadAdapter.getInsightsForDate(campaign.externalId, dateStr, integration.accountId);
      live = row ? { impressions: row.impressions, reach: row.reach, clicks: row.clicks, spend: row.spend, conversions: row.conversions, revenue: row.revenue, frequency: row.frequency } : { impressions: 0, clicks: 0, spend: 0, conversions: 0 };
    }
  } catch (err) {
    liveError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    campaign: { id: campaign.id, name: campaign.name, platform: campaign.platform },
    date: dateStr,
    hasStoredRow: Boolean(metricRow),
    storedRaw,
    officialNormalized,
    independentRecompute: independent,
    normalizedComparison,
    live,
    liveError,
    rawComparison: live ? compareRawMetrics(storedRaw, live) : null,
  });
}
