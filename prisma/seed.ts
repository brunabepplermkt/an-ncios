import { PrismaClient } from "@prisma/client";
import {
  DEMO_CAMPAIGNS,
  DEMO_CREATIVES,
  INITIAL_CATEGORIES,
  generateDailyMetrics,
} from "../lib/demo/seed-data";

const prisma = new PrismaClient();

const DAYS_OF_HISTORY = 30;

async function main() {
  console.log("Limpando dados demo anteriores...");
  await prisma.creativeMetricDaily.deleteMany();
  await prisma.campaignCreative.deleteMany();
  await prisma.campaignMetricDaily.deleteMany();
  await prisma.draft.deleteMany();
  await prisma.creative.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.category.deleteMany();

  console.log("Criando categorias...");
  const categories = new Map<string, string>();
  for (const name of INITIAL_CATEGORIES) {
    const cat = await prisma.category.create({ data: { name } });
    categories.set(name, cat.id);
  }

  console.log("Criando campanhas demo + métricas diárias...");
  const campaignIdByKey = new Map<string, string>();
  for (const profile of DEMO_CAMPAIGNS) {
    const campaign = await prisma.campaign.create({
      data: {
        platform: profile.platform,
        name: profile.name,
        status: profile.status,
        objective: profile.objective,
        dailyBudget: profile.dailyBudget,
        isDemo: true,
      },
    });
    campaignIdByKey.set(profile.key, campaign.id);

    const rows = generateDailyMetrics(profile, DAYS_OF_HISTORY);
    await prisma.campaignMetricDaily.createMany({
      data: rows.map((r) => ({
        campaignId: campaign.id,
        date: r.date,
        impressions: r.impressions,
        reach: r.reach,
        clicks: r.clicks,
        spend: r.spend,
        conversions: r.conversions,
        revenue: r.revenue,
        frequency: r.frequency,
      })),
    });
  }

  console.log("Criando criativos demo...");
  for (const c of DEMO_CREATIVES) {
    const creative = await prisma.creative.create({
      data: {
        fileName: c.fileName,
        storageKey: `demo:${c.key}`,
        mimeType: c.kind === "IMAGE" ? "image/jpeg" : "video/mp4",
        kind: c.kind,
        sizeBytes: c.kind === "IMAGE" ? 480_000 : 8_200_000,
        width: c.width,
        height: c.height,
        durationSeconds: c.durationSeconds,
        product: c.product,
        tags: JSON.stringify(c.tags),
        categoryId: categories.get(c.category),
      },
    });

    for (const campaignKey of c.usedInCampaignKeys) {
      const campaignId = campaignIdByKey.get(campaignKey);
      if (!campaignId) continue;
      await prisma.campaignCreative.create({ data: { campaignId, creativeId: creative.id } });

      const profile = DEMO_CAMPAIGNS.find((p) => p.key === campaignKey)!;
      const platform = profile.platform;
      const days = 14;
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);

        const progress = 1 - i / days;
        let ctrMultiplier = 1;
        if (c.performance === "fatigued") ctrMultiplier = 1 - progress * 0.5;
        if (c.performance === "top") ctrMultiplier = 1.15;

        const impressions = Math.round(2000 + Math.random() * 1500);
        const ctr = Math.max(0.004, 0.02 * ctrMultiplier * (0.8 + Math.random() * 0.4));
        const clicks = Math.round(impressions * ctr);
        const spend = Number((clicks * (0.8 + Math.random() * 0.6)).toFixed(2));
        const conversions = Math.round(clicks * 0.05 * (0.7 + Math.random() * 0.6));

        await prisma.creativeMetricDaily.create({
          data: { creativeId: creative.id, campaignId, platform, date, impressions, clicks, spend, conversions },
        });
      }
    }
  }

  console.log("Criando configurações padrão...");
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  console.log("Seed concluído.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
