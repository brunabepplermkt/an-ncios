import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { classifyMetaError } from "@/lib/adapters/errors";
import type { AdPlatformCampaign, AdPlatformCampaignInsights, AdReadAdapter, ConnectionState } from "../types";

const execFileAsync = promisify(execFile);

export interface MetaAdAccount {
  id: string; // "act_XXXXXXXXX"
  accountId: string; // numeric, no "act_" prefix
  name: string;
  currency: string;
  timezoneName: string;
  accountStatus: number;
}

interface MetaActionEntry {
  action_type: string;
  value: string;
}

interface MetaCampaignRaw {
  id: string;
  name: string;
  status: string;
  effective_status?: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

export interface MetaAdCreative {
  id: string;
  name: string;
  title?: string;
  body?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
}

interface MetaInsightsRow {
  date_start: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  spend?: string;
  frequency?: string;
  actions?: MetaActionEntry[];
  conversions?: MetaActionEntry[];
  conversion_values?: MetaActionEntry[];
}

/**
 * Read-only Meta Ads adapter, backed by `meta-ads-open-cli`
 * (https://github.com/Bin-Huang/meta-ads-open-cli — installed globally,
 * see docs/SKILLS.md). Field names below were verified against the CLI's
 * own installed source (node_modules-free global install, dist/commands/*.js)
 * rather than guessed — it calls the real Graph API v24.0 with fixed field
 * lists, so this adapter mirrors those exact fields.
 *
 * Every method here is read-only. The CLI itself exposes no mutating
 * commands, and this file must never gain a write path — see
 * lib/adapters/disabled-write-adapter.ts for why writes are handled
 * completely separately.
 */
export class MetaReadAdapter implements AdReadAdapter {
  platform = "META" as const;

  private get accessToken() {
    return process.env.META_ADS_ACCESS_TOKEN?.trim();
  }

  private get accountId() {
    return process.env.META_AD_ACCOUNT_ID?.trim();
  }

  isTokenConfigured(): boolean {
    return Boolean(this.accessToken);
  }

  async getConnectionState(): Promise<ConnectionState> {
    if (!this.accessToken) {
      return {
        status: "CONFIG_REQUIRED",
        detail: "Defina META_ADS_ACCESS_TOKEN no .env. Veja docs/META_SETUP.md.",
      };
    }
    try {
      await this.runCli(["me"]);
      if (!this.accountId) {
        return { status: "CONFIG_REQUIRED", detail: "Token válido. Selecione uma conta de anúncios para continuar." };
      }
      return { status: "CONNECTED", detail: "meta-ads-open-cli autenticado e conta selecionada." };
    } catch (err) {
      const classified = classifyMetaError("META", (err as Error).message);
      return { status: "ERROR", detail: classified.message };
    }
  }

  /** Calls `me` (identity) — used by "Testar conexão" before any account is selected. */
  async testConnection(): Promise<{ id: string; name: string; email?: string }> {
    const { stdout } = await this.runCli(["me"]);
    return JSON.parse(stdout);
  }

  async listAdAccounts(): Promise<MetaAdAccount[]> {
    const { stdout } = await this.runCli(["ad-accounts", "--limit", "100"]);
    const parsed = JSON.parse(stdout) as { data?: Array<Record<string, unknown>> };
    return (parsed.data ?? []).map((a) => ({
      id: String(a.id),
      accountId: String(a.account_id ?? String(a.id).replace(/^act_/, "")),
      name: String(a.name ?? a.id),
      currency: String(a.currency ?? ""),
      timezoneName: String(a.timezone_name ?? ""),
      accountStatus: Number(a.account_status ?? 0),
    }));
  }

  /**
   * Lists existing ad creatives on the account (name/title/body/thumbnail
   * only — never downloads the asset). Used only to offer a best-effort,
   * read-only match against our internal creative library; never used to
   * fetch, duplicate, or modify the remote asset or its ad.
   */
  async listCreatives(accountIdOverride?: string): Promise<MetaAdCreative[]> {
    const accountId = this.requireAccountId(accountIdOverride);
    const rows = await this.paginate<Record<string, unknown>>(["creatives", accountId, "--limit", "100"]);
    return rows.map((c) => ({
      id: String(c.id),
      name: String(c.name ?? ""),
      title: c.title ? String(c.title) : undefined,
      body: c.body ? String(c.body) : undefined,
      thumbnailUrl: c.thumbnail_url ? String(c.thumbnail_url) : undefined,
      imageUrl: c.image_url ? String(c.image_url) : undefined,
    }));
  }

  /** `accountIdOverride` lets callers pass the account selected in the DB (Integration.accountId) instead of relying on env. */
  async listCampaigns(accountIdOverride?: string): Promise<AdPlatformCampaign[]> {
    const accountId = this.requireAccountId(accountIdOverride);
    const rows = await this.paginate<MetaCampaignRaw>(["campaigns", accountId, "--limit", "100"]);
    return rows.map((c) => ({
      externalId: c.id,
      name: c.name,
      status: c.effective_status ?? c.status,
      objective: c.objective,
      dailyBudget: c.daily_budget ? Number(c.daily_budget) / 100 : undefined,
    }));
  }

  async getInsights(campaignExternalId: string, days: number): Promise<AdPlatformCampaignInsights[]> {
    if (!this.accessToken) throw classifyMetaError("META", "No credentials found. Set META_ADS_ACCESS_TOKEN.");
    const preset = days <= 1 ? "yesterday" : days <= 7 ? "last_7d" : days <= 14 ? "last_14d" : days <= 30 ? "last_30d" : days <= 90 ? "last_90d" : "maximum";
    const rows = await this.paginate<MetaInsightsRow>([
      "insights",
      campaignExternalId,
      "--date-preset",
      preset,
      "--time-increment",
      "1",
      "--limit",
      "100",
    ]);
    return rows.map((row) => ({
      campaignExternalId,
      date: row.date_start,
      impressions: Number(row.impressions ?? 0),
      reach: row.reach ? Number(row.reach) : undefined,
      clicks: Number(row.clicks ?? 0),
      spend: Number(row.spend ?? 0),
      conversions: sumActionValues(row.conversions),
      revenue: row.conversion_values ? sumActionValues(row.conversion_values) : undefined,
      frequency: row.frequency ? Number(row.frequency) : undefined,
    }));
  }

  private requireAccountId(override?: string): string {
    if (!this.accessToken) throw classifyMetaError("META", "No credentials found. Set META_ADS_ACCESS_TOKEN.");
    const accountId = override ?? this.accountId;
    if (!accountId) throw classifyMetaError("META", "No ad account selected. Select an account first.");
    return accountId;
  }

  private async paginate<T>(baseArgs: string[], maxPages = 20): Promise<T[]> {
    const results: T[] = [];
    let after: string | undefined;
    for (let page = 0; page < maxPages; page++) {
      const args = after ? [...baseArgs, "--after", after] : baseArgs;
      const { stdout } = await this.runCli(args);
      const parsed = JSON.parse(stdout) as { data?: T[]; paging?: { cursors?: { after?: string }; next?: string } };
      results.push(...(parsed.data ?? []));
      after = parsed.paging?.next ? parsed.paging?.cursors?.after : undefined;
      if (!after) break;
    }
    return results;
  }

  private async runCli(args: string[]) {
    try {
      return await execFileAsync("meta-ads-open-cli", [...args, "--format", "compact"], {
        env: { ...process.env, META_ADS_ACCESS_TOKEN: this.accessToken },
        timeout: 20_000,
        maxBuffer: 20 * 1024 * 1024,
      });
    } catch (err) {
      const execErr = err as { stderr?: string; message: string };
      const stderrMsg = tryParseCliError(execErr.stderr) ?? execErr.stderr?.trim() ?? execErr.message;
      throw classifyMetaError("META", stderrMsg);
    }
  }
}

function tryParseCliError(stderr?: string): string | undefined {
  if (!stderr) return undefined;
  try {
    const parsed = JSON.parse(stderr.trim());
    return typeof parsed.error === "string" ? parsed.error : undefined;
  } catch {
    return undefined;
  }
}

function sumActionValues(entries?: MetaActionEntry[]): number {
  if (!entries || entries.length === 0) return 0;
  return entries.reduce((sum, e) => sum + (Number(e.value) || 0), 0);
}

export const metaReadAdapter = new MetaReadAdapter();
