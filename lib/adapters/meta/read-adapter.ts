import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AdPlatformCampaign, AdPlatformCampaignInsights, AdReadAdapter, ConnectionState } from "../types";

const execFileAsync = promisify(execFile);

/**
 * Read-only Meta Ads adapter, backed by the official-data `meta-ads-open-cli`
 * (https://github.com/Bin-Huang/meta-ads-open-cli), installed globally and
 * validated as a skill (see docs/SKILLS.md). It is only ever invoked with
 * read/list/insights subcommands — never with anything mutating, and the
 * CLI itself exposes no mutating commands.
 *
 * Until META_ADS_ACCESS_TOKEN + META_AD_ACCOUNT_ID are set, every method
 * either reports a connection status or throws — it NEVER silently returns
 * fabricated data. Demo data lives in lib/demo and is served separately.
 */
export class MetaReadAdapter implements AdReadAdapter {
  platform = "META" as const;

  private get accessToken() {
    return process.env.META_ADS_ACCESS_TOKEN?.trim();
  }

  private get accountId() {
    return process.env.META_AD_ACCOUNT_ID?.trim();
  }

  async getConnectionState(): Promise<ConnectionState> {
    if (!this.accessToken || !this.accountId) {
      return {
        status: "CONFIG_REQUIRED",
        detail: "Defina META_ADS_ACCESS_TOKEN e META_AD_ACCOUNT_ID no .env. Veja docs/META_SETUP.md.",
      };
    }
    try {
      await execFileAsync("meta-ads-open-cli", ["me"], {
        env: { ...process.env, META_ADS_ACCESS_TOKEN: this.accessToken },
        timeout: 10_000,
      });
      return { status: "CONNECTED", detail: "meta-ads-open-cli autenticado com sucesso." };
    } catch (err) {
      return {
        status: "ERROR",
        detail: `Falha ao autenticar com meta-ads-open-cli: ${(err as Error).message}`,
      };
    }
  }

  async listCampaigns(): Promise<AdPlatformCampaign[]> {
    this.assertConfigured();
    const { stdout } = await this.runCli(["campaigns", this.accountId!]);
    const data = JSON.parse(stdout) as Array<{ id: string; name: string; status: string; objective?: string; daily_budget?: string }>;
    return data.map((c) => ({
      externalId: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : undefined,
    }));
  }

  async getInsights(campaignExternalId: string, days: number): Promise<AdPlatformCampaignInsights[]> {
    this.assertConfigured();
    const preset = days <= 7 ? "last_7d" : days <= 14 ? "last_14d" : days <= 30 ? "last_30d" : "last_90d";
    const { stdout } = await this.runCli([
      "insights",
      campaignExternalId,
      "--date-preset",
      preset,
      "--time-increment",
      "1",
    ]);
    const data = JSON.parse(stdout) as Array<{
      date_start: string;
      impressions?: string;
      reach?: string;
      clicks?: string;
      spend?: string;
      frequency?: string;
    }>;
    return data.map((row) => ({
      campaignExternalId,
      date: row.date_start,
      impressions: Number(row.impressions ?? 0),
      reach: row.reach ? Number(row.reach) : undefined,
      clicks: Number(row.clicks ?? 0),
      spend: Number(row.spend ?? 0),
      conversions: 0, // requires mapping `actions` array; left for the real integration pass
      frequency: row.frequency ? Number(row.frequency) : undefined,
    }));
  }

  private assertConfigured() {
    if (!this.accessToken || !this.accountId) {
      throw new Error("Meta Ads não configurado. Defina META_ADS_ACCESS_TOKEN e META_AD_ACCOUNT_ID.");
    }
  }

  private runCli(args: string[]) {
    return execFileAsync("meta-ads-open-cli", args, {
      env: { ...process.env, META_ADS_ACCESS_TOKEN: this.accessToken },
      timeout: 20_000,
      maxBuffer: 10 * 1024 * 1024,
    });
  }
}

export const metaReadAdapter = new MetaReadAdapter();
