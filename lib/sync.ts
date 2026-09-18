import { prisma } from "@/lib/db";
import { AdApiError, describeAdApiError } from "@/lib/adapters/errors";
import { recordSync } from "@/lib/integrations";
import type { AdPlatformCampaign, AdPlatformCampaignInsights } from "@/lib/adapters/types";

export interface SyncResult {
  ok: boolean;
  campaignsImported: number;
  periodStart: Date;
  periodEnd: Date;
  message: string;
}

interface SyncableAdapter {
  listCampaigns(accountId?: string): Promise<AdPlatformCampaign[]>;
  getInsights(campaignExternalId: string, days: number): Promise<AdPlatformCampaignInsights[]>;
}

/**
 * Shared manual-sync routine for both platforms: pulls campaigns + daily
 * insights from the adapter and upserts them as REAL (isDemo=false) rows,
 * keyed by the (platform, externalId) / (campaignId, date) unique
 * constraints so re-running sync updates in place instead of duplicating.
 * Never touches demo rows. Never calls anything on a write adapter.
 */
export async function syncPlatformCampaigns(
  platform: "META" | "GOOGLE",
  adapter: SyncableAdapter,
  accountId: string,
  days: number
): Promise<SyncResult> {
  const periodEnd = new Date();
  periodEnd.setHours(23, 59, 59, 999);
  const periodStart = new Date(periodEnd.getTime() - (days - 1) * 86_400_000);
  periodStart.setHours(0, 0, 0, 0);

  try {
    const campaigns = await adapter.listCampaigns(accountId);
    let imported = 0;

    for (const c of campaigns) {
      const campaignRow = await prisma.campaign.upsert({
        where: { platform_externalId: { platform, externalId: c.externalId } },
        update: { name: c.name, status: c.status, objective: c.objective, dailyBudget: c.dailyBudget, isDemo: false },
        create: {
          platform,
          externalId: c.externalId,
          name: c.name,
          status: c.status,
          objective: c.objective,
          dailyBudget: c.dailyBudget,
          isDemo: false,
        },
      });

      const insights = await adapter.getInsights(c.externalId, days);
      for (const row of insights) {
        const date = new Date(`${row.date}T00:00:00.000Z`);
        const data = {
          impressions: row.impressions,
          reach: row.reach,
          clicks: row.clicks,
          spend: row.spend,
          conversions: row.conversions,
          revenue: row.revenue,
          frequency: row.frequency,
        };
        await prisma.campaignMetricDaily.upsert({
          where: { campaignId_date: { campaignId: campaignRow.id, date } },
          update: data,
          create: { campaignId: campaignRow.id, date, ...data },
        });
      }
      imported++;
    }

    const message = `Importadas ${imported} campanha(s) de ${periodStart.toISOString().slice(0, 10)} a ${periodEnd.toISOString().slice(0, 10)}.`;
    await recordSync({ platform, status: "SUCCESS", campaignsImported: imported, periodStart, periodEnd, message });
    return { ok: true, campaignsImported: imported, periodStart, periodEnd, message };
  } catch (err) {
    const classified = err instanceof AdApiError ? err : new AdApiError(platform, "UNKNOWN", err instanceof Error ? err.message : String(err));
    const message = describeAdApiError(classified);
    await recordSync({ platform, status: "ERROR", message, periodStart, periodEnd });
    return { ok: false, campaignsImported: 0, periodStart, periodEnd, message };
  }
}
