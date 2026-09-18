import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prepareTestDatabase } from "./setup/test-db";

prepareTestDatabase("campaigns-data");

const { prisma } = await import("@/lib/db");
const { getCampaignsWithMetrics, getDashboardSummary } = await import("@/lib/data/campaigns");
const { resolvePeriod } = await import("@/lib/data/period");

async function resetDb() {
  await prisma.campaignMetricDaily.deleteMany();
  await prisma.campaign.deleteMany();
}

beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

const period = resolvePeriod("30d", "UTC");

describe("getCampaignsWithMetrics / getDashboardSummary with edge-case data", () => {
  it("handles a campaign with spend but zero conversions without crashing, and excludes it from topPerformers", async () => {
    const campaign = await prisma.campaign.create({
      data: { platform: "GOOGLE", name: "Sem conversão", status: "ACTIVE", isDemo: false, externalId: "c-noconv" },
    });
    await prisma.campaignMetricDaily.create({
      data: { campaignId: campaign.id, date: new Date(), impressions: 5000, clicks: 100, spend: 200, conversions: 0 },
    });

    const summary = await getDashboardSummary(period, "GOOGLE");
    expect(summary.totals.spend).toBe(200);
    expect(summary.totals.cpa).toBeUndefined(); // never divide by zero conversions
    expect(summary.topSpend.some((c) => c.id === campaign.id)).toBe(true);
    expect(summary.topPerformers.some((c) => c.id === campaign.id)).toBe(false);
  });

  it("handles a campaign with literally no metric rows (never synced a day yet) as all-zero, not a crash", async () => {
    await prisma.campaign.create({
      data: { platform: "META", name: "Sem métricas ainda", status: "ACTIVE", isDemo: false, externalId: "c-empty" },
    });

    const campaigns = await getCampaignsWithMetrics(period, "META");
    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].raw.impressions).toBe(0);
    expect(campaigns[0].normalized.ctr).toBeUndefined();
  });

  it("does not fabricate reach/frequency/revenue when the platform never reports them", async () => {
    const campaign = await prisma.campaign.create({
      data: { platform: "GOOGLE", name: "Google sem reach", status: "ACTIVE", isDemo: false, externalId: "c-noreach" },
    });
    await prisma.campaignMetricDaily.create({
      data: { campaignId: campaign.id, date: new Date(), impressions: 100, clicks: 5, spend: 10, conversions: 1 },
    });

    const [row] = await getCampaignsWithMetrics(period, "GOOGLE");
    expect(row.raw.reach).toBeUndefined();
    expect(row.normalized.frequency).toBeUndefined();
    expect(row.normalized.roas).toBeUndefined();
  });
});
