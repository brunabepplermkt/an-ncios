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

export type ResolvedStatus = "NOT_CONNECTED" | "CONFIG_REQUIRED" | "CONNECTED" | "ERROR";

export interface IntegrationSummary {
  status: ResolvedStatus;
  detail: string;
  accountId: string | null;
  accountName: string | null;
  lastSyncedAt: Date | null;
  lastSyncStatus: "SUCCESS" | "ERROR" | null;
  lastSyncCampaigns: number | null;
  lastSyncPeriodStart: Date | null;
  lastSyncPeriodEnd: Date | null;
}

/**
 * DB-driven status for the Integrations/Settings pages. Deliberately does
 * NOT call the provider on every page render (that would burn API quota
 * just from opening a page) — it reflects the outcome of the last explicit
 * "Testar conexão"/"Sincronizar agora" action the user triggered.
 */
export async function resolveMetaStatus(): Promise<IntegrationSummary> {
  const { metaReadAdapter } = await import("@/lib/adapters/meta/read-adapter");
  const integration = await getIntegration("META");

  if (!metaReadAdapter.isTokenConfigured()) {
    return summary("CONFIG_REQUIRED", "Defina META_ADS_ACCESS_TOKEN no .env e clique em Testar conexão.", integration);
  }
  if (!integration?.accountId) {
    return summary("CONFIG_REQUIRED", "Token configurado. Teste a conexão e selecione uma conta de anúncios.", integration);
  }
  if (integration.lastTestOk === false) {
    return summary("ERROR", integration.lastSyncMessage ?? "A última tentativa de conexão falhou.", integration);
  }
  if (integration.lastSyncStatus === "ERROR") {
    return summary("ERROR", integration.lastSyncMessage ?? "A última sincronização falhou.", integration);
  }
  return summary("CONNECTED", integration.lastSyncedAt ? "Conectado — pronto para sincronizar novamente." : "Conta selecionada. Clique em Sincronizar agora.", integration);
}

export async function resolveGoogleStatus(): Promise<IntegrationSummary> {
  const { googleReadAdapter } = await import("@/lib/adapters/google/read-adapter");
  const integration = await getIntegration("GOOGLE");

  const missing = googleReadAdapter.missingEnvVars();
  if (missing.length > 0) {
    return summary("CONFIG_REQUIRED", `Faltam variáveis: ${missing.join(", ")}. Veja docs/GOOGLE_SETUP.md.`, integration);
  }
  if (!integration?.accountId) {
    return summary("CONFIG_REQUIRED", "Credenciais configuradas. Teste a conexão e selecione o Customer ID.", integration);
  }
  if (integration.lastTestOk === false) {
    return summary("ERROR", integration.lastSyncMessage ?? "A última tentativa de conexão falhou.", integration);
  }
  if (integration.lastSyncStatus === "ERROR") {
    return summary("ERROR", integration.lastSyncMessage ?? "A última sincronização falhou.", integration);
  }
  return summary("CONNECTED", integration.lastSyncedAt ? "Conectado — pronto para sincronizar novamente." : "Conta selecionada. Clique em Sincronizar agora.", integration);
}

function summary(
  status: ResolvedStatus,
  detail: string,
  integration: Awaited<ReturnType<typeof getIntegration>>
): IntegrationSummary {
  return {
    status,
    detail,
    accountId: integration?.accountId ?? null,
    accountName: integration?.accountName ?? null,
    lastSyncedAt: integration?.lastSyncedAt ?? null,
    lastSyncStatus: integration?.lastSyncStatus ?? null,
    lastSyncCampaigns: integration?.lastSyncCampaigns ?? null,
    lastSyncPeriodStart: integration?.lastSyncPeriodStart ?? null,
    lastSyncPeriodEnd: integration?.lastSyncPeriodEnd ?? null,
  };
}
