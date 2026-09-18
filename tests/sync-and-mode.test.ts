import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prepareTestDatabase } from "./setup/test-db";

// Must run before any `@/lib/db` import — PrismaClient binds DATABASE_URL
// at construction time. This points at a throwaway prisma/test.db, never
// the dev.db the running app/demo data lives in.
prepareTestDatabase("sync-and-mode");

const { prisma } = await import("@/lib/db");
const { syncPlatformCampaigns } = await import("@/lib/sync");
const { getPlatformMode, getPlatformModes, isDemoFilterFor } = await import("@/lib/data/mode");
const { campaignModeWhere } = await import("@/lib/data/campaigns");

async function resetDb() {
  await prisma.campaignMetricDaily.deleteMany();
  await prisma.syncLog.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.campaign.deleteMany();
}

beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

const fakeCampaigns = [
  { externalId: "camp-1", name: "Campanha 1", status: "ACTIVE", objective: "Leads", dailyBudget: 50 },
];

function fakeAdapter(overrides?: { insights?: Array<{ date: string; impressions: number; clicks: number; spend: number; conversions: number }>; throwOnInsights?: boolean; throwOnList?: boolean }) {
  return {
    async listCampaigns() {
      if (overrides?.throwOnList) throw new Error("boom listing campaigns");
      return fakeCampaigns;
    },
    async getInsights(campaignExternalId: string) {
      if (overrides?.throwOnInsights) throw new Error("boom fetching insights");
      const rows = overrides?.insights ?? [{ date: "2026-01-01", impressions: 1000, clicks: 20, spend: 15.5, conversions: 2 }];
      return rows.map((r) => ({ campaignExternalId, ...r }));
    },
  };
}

describe("syncPlatformCampaigns", () => {
  it("creates real (isDemo=false) campaigns and daily metrics from adapter data", async () => {
    const result = await syncPlatformCampaigns("GOOGLE", fakeAdapter(), "1234567890", 30);
    expect(result.ok).toBe(true);
    expect(result.campaignsImported).toBe(1);

    const campaign = await prisma.campaign.findFirst({ where: { platform: "GOOGLE", externalId: "camp-1" } });
    expect(campaign?.isDemo).toBe(false);
    expect(campaign?.name).toBe("Campanha 1");

    const metric = await prisma.campaignMetricDaily.findFirst({ where: { campaignId: campaign!.id } });
    expect(metric?.impressions).toBe(1000);
    expect(metric?.spend).toBe(15.5);
  });

  it("is idempotent: syncing twice updates in place instead of duplicating", async () => {
    await syncPlatformCampaigns("GOOGLE", fakeAdapter(), "1234567890", 30);
    await syncPlatformCampaigns(
      "GOOGLE",
      fakeAdapter({ insights: [{ date: "2026-01-01", impressions: 2000, clicks: 40, spend: 31, conversions: 4 }] }),
      "1234567890",
      30
    );

    const campaigns = await prisma.campaign.findMany({ where: { platform: "GOOGLE" } });
    expect(campaigns).toHaveLength(1);

    const metrics = await prisma.campaignMetricDaily.findMany({ where: { campaignId: campaigns[0].id } });
    expect(metrics).toHaveLength(1);
    expect(metrics[0].impressions).toBe(2000); // updated, not duplicated
  });

  it("records a SyncLog ERROR (and never creates campaigns) when the adapter throws", async () => {
    const result = await syncPlatformCampaigns("META", fakeAdapter({ throwOnList: true }), "act_123", 30);
    expect(result.ok).toBe(false);

    const campaigns = await prisma.campaign.count({ where: { platform: "META" } });
    expect(campaigns).toBe(0);

    const log = await prisma.syncLog.findFirst({ where: { platform: "META" }, orderBy: { createdAt: "desc" } });
    expect(log?.status).toBe("ERROR");
  });

  it("never touches demo campaigns", async () => {
    await prisma.campaign.create({ data: { platform: "GOOGLE", name: "Demo campaign", status: "ACTIVE", isDemo: true } });
    await syncPlatformCampaigns("GOOGLE", fakeAdapter(), "1234567890", 30);

    const demoStillThere = await prisma.campaign.findFirst({ where: { platform: "GOOGLE", isDemo: true } });
    expect(demoStillThere).not.toBeNull();
    expect(demoStillThere?.name).toBe("Demo campaign");
  });
});

describe("getPlatformMode / campaignModeWhere", () => {
  it("reports DEMO when no real campaign exists for a platform", async () => {
    await prisma.campaign.create({ data: { platform: "META", name: "Demo", status: "ACTIVE", isDemo: true } });
    expect(await getPlatformMode("META")).toBe("DEMO");
  });

  it("reports REAL as soon as one real campaign exists, and never mixes demo+real", async () => {
    await prisma.campaign.create({ data: { platform: "META", name: "Demo", status: "ACTIVE", isDemo: true } });
    await syncPlatformCampaigns("META", fakeAdapter(), "act_1", 30);

    expect(await getPlatformMode("META")).toBe("REAL");

    const where = await campaignModeWhere("META");
    expect(where).toEqual({ platform: "META", isDemo: false });

    const visible = await prisma.campaign.findMany({ where });
    expect(visible.every((c) => !c.isDemo)).toBe(true);
  });

  it("resolves modes independently per platform", async () => {
    await prisma.campaign.create({ data: { platform: "GOOGLE", name: "Demo", status: "ACTIVE", isDemo: true } });
    await syncPlatformCampaigns("META", fakeAdapter(), "act_1", 30);

    const modes = await getPlatformModes();
    expect(modes.META).toBe("REAL");
    expect(modes.GOOGLE).toBe("DEMO");
  });

  it("isDemoFilterFor maps DEMO->true and REAL->false", () => {
    expect(isDemoFilterFor("DEMO")).toBe(true);
    expect(isDemoFilterFor("REAL")).toBe(false);
  });
});
