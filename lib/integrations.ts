import { prisma } from "@/lib/db";
import type { Platform } from "@prisma/client";

export interface IntegrationFields {
  accountId?: string | null;
  accountName?: string | null;
  loginCustomerId?: string | null;
  lastTestedAt?: Date;
  lastTestOk?: boolean;
  lastSyncedAt?: Date;
  lastSyncStatus?: "SUCCESS" | "ERROR";
  lastSyncMessage?: string | null;
  lastSyncCampaigns?: number;
  lastSyncPeriodStart?: Date | null;
  lastSyncPeriodEnd?: Date | null;
}

export async function getIntegration(platform: Platform) {
  return prisma.integration.findUnique({ where: { platform } });
}

export async function upsertIntegration(platform: Platform, data: IntegrationFields) {
  return prisma.integration.upsert({
    where: { platform },
    update: data,
    create: { platform, ...data },
  });
}

export async function recordSync(params: {
  platform: Platform;
  status: "SUCCESS" | "ERROR";
  message?: string;
  campaignsImported?: number;
  periodStart?: Date;
  periodEnd?: Date;
}) {
  await prisma.syncLog.create({
    data: {
      platform: params.platform,
      status: params.status,
      message: params.message,
      campaignsImported: params.campaignsImported ?? 0,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
    },
  });
  await upsertIntegration(params.platform, {
    lastSyncedAt: new Date(),
    lastSyncStatus: params.status,
    lastSyncMessage: params.message,
    lastSyncCampaigns: params.campaignsImported ?? 0,
    lastSyncPeriodStart: params.periodStart,
    lastSyncPeriodEnd: params.periodEnd,
  });
}

export async function getRecentSyncLogs(platform: Platform, limit = 10) {
  return prisma.syncLog.findMany({ where: { platform }, orderBy: { createdAt: "desc" }, take: limit });
}
