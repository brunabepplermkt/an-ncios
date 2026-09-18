import type { RawMetrics } from "@/lib/metrics/types";

export interface AdPlatformCampaign {
  externalId: string;
  name: string;
  status: string;
  objective?: string;
  dailyBudget?: number;
}

export interface AdPlatformCampaignInsights extends RawMetrics {
  campaignExternalId: string;
  date: string; // ISO date (day)
}

export type ConnectionStatus = "NOT_CONNECTED" | "CONFIG_REQUIRED" | "CONNECTED" | "ERROR";

export interface ConnectionState {
  status: ConnectionStatus;
  detail: string;
}

/** Read-only access to a platform. This is the ONLY interface allowed to touch real accounts in V1. */
export interface AdReadAdapter {
  platform: "META" | "GOOGLE";
  getConnectionState(): Promise<ConnectionState>;
  listCampaigns(): Promise<AdPlatformCampaign[]>;
  getInsights(campaignExternalId: string, days: number): Promise<AdPlatformCampaignInsights[]>;
}

/**
 * Write access to a platform (create/update/pause/publish campaigns).
 * V1 ships ONLY disabled implementations — every method throws.
 * This keeps the write path impossible to call by accident while the
 * real integration (official API or ArmaVita-style MCP) is built later.
 */
export interface AdWriteAdapter {
  platform: "META" | "GOOGLE";
  readonly enabled: false;
  publishCampaign(): Promise<never>;
  updateBudget(): Promise<never>;
  pauseCampaign(): Promise<never>;
}
