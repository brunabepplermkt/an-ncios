import { prisma } from "@/lib/db";
import { normalizeMetrics } from "@/lib/metrics/calc";
import type { NormalizedMetrics, RawMetrics } from "@/lib/metrics/types";
import { campaignModeWhere } from "./campaigns";

export interface CreativeListItem {
  id: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  kind: "IMAGE" | "VIDEO";
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  product: string | null;
  tags: string[];
  note: string | null;
  categoryId: string | null;
  categoryName: string | null;
  createdAt: string;
  isDemo: boolean;
}

export async function listCreatives(params?: { categoryId?: string; kind?: "IMAGE" | "VIDEO"; search?: string }) {
  const creatives = await prisma.creative.findMany({
    where: {
      categoryId: params?.categoryId,
      kind: params?.kind,
      ...(params?.search
        ? {
            OR: [
              { fileName: { contains: params.search } },
              { product: { contains: params.search } },
              { tags: { contains: params.search } },
            ],
          }
        : {}),
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return creatives.map(toListItem);
}

function toListItem(c: Awaited<ReturnType<typeof prisma.creative.findMany>>[number] & { category: { name: string } | null }): CreativeListItem {
  return {
    id: c.id,
    fileName: c.fileName,
    storageKey: c.storageKey,
    mimeType: c.mimeType,
    kind: c.kind as "IMAGE" | "VIDEO",
    sizeBytes: c.sizeBytes,
    width: c.width,
    height: c.height,
    durationSeconds: c.durationSeconds,
    product: c.product,
    tags: safeParseTags(c.tags),
    note: c.note,
    categoryId: c.categoryId,
    categoryName: c.category?.name ?? null,
    createdAt: c.createdAt.toISOString(),
    isDemo: c.storageKey.startsWith("demo:"),
  };
}

export function safeParseTags(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export interface CreativeStats {
  creativeId: string;
  fileName: string;
  kind: string;
  categoryName: string | null;
  product: string | null;
  campaignsUsed: string[];
  totalRaw: RawMetrics;
  totalNormalized: NormalizedMetrics;
  recentCtr?: number; // last N days
  priorCtr?: number; // N days before that
  fatigueDropPct?: number; // positive = CTR dropped
  neverUsed: boolean;
}

/**
 * Aggregates CreativeMetricDaily per creative and flags fatigue (CTR drop
 * between two recent windows). Only counts usage/metrics tied to campaigns
 * in the platform's current mode (DEMO or REAL) — once a platform switches
 * to REAL, its old demo campaigns' creative metrics stop counting here.
 */
export async function getCreativeStats(windowDays = 7): Promise<CreativeStats[]> {
  const [metaWhere, googleWhere] = await Promise.all([campaignModeWhere("META"), campaignModeWhere("GOOGLE")]);
  const validCampaigns = await prisma.campaign.findMany({
    where: { OR: [metaWhere, googleWhere] },
    select: { id: true },
  });
  const validCampaignIds = new Set(validCampaigns.map((c) => c.id));

  const creatives = await prisma.creative.findMany({
    include: {
      metricsDaily: { orderBy: { date: "desc" } },
      usages: { include: { campaign: true } },
    },
  });

  const now = new Date();
  const recentStart = new Date(now.getTime() - windowDays * 86_400_000);
  const priorStart = new Date(now.getTime() - windowDays * 2 * 86_400_000);

  return creatives.map((c) => {
    const metricsDaily = c.metricsDaily.filter((m) => !m.campaignId || validCampaignIds.has(m.campaignId));
    const usages = c.usages.filter((u) => validCampaignIds.has(u.campaignId));

    const totalRaw: RawMetrics = metricsDaily.reduce<RawMetrics>(
      (acc, m) => ({
        impressions: acc.impressions + m.impressions,
        clicks: acc.clicks + m.clicks,
        spend: acc.spend + m.spend,
        conversions: acc.conversions + m.conversions,
      }),
      { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
    );

    const recent = metricsDaily.filter((m) => m.date >= recentStart);
    const prior = metricsDaily.filter((m) => m.date >= priorStart && m.date < recentStart);

    const recentCtr = ctrOf(recent);
    const priorCtr = ctrOf(prior);
    const fatigueDropPct =
      recentCtr !== undefined && priorCtr !== undefined && priorCtr > 0
        ? ((priorCtr - recentCtr) / priorCtr) * 100
        : undefined;

    return {
      creativeId: c.id,
      fileName: c.fileName,
      kind: c.kind,
      categoryName: null,
      product: c.product,
      campaignsUsed: usages.map((u) => u.campaign.name),
      totalRaw,
      totalNormalized: normalizeMetrics(totalRaw),
      recentCtr,
      priorCtr,
      fatigueDropPct,
      neverUsed: usages.length === 0,
    };
  });
}

function ctrOf(rows: Array<{ impressions: number; clicks: number }>): number | undefined {
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  return impressions > 0 ? clicks / impressions : undefined;
}
