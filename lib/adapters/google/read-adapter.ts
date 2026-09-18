import { classifyGoogleError } from "@/lib/adapters/errors";
import type { AdPlatformCampaign, AdPlatformCampaignInsights, AdReadAdapter, ConnectionState } from "../types";
import { getGoogleAccessToken } from "./oauth";
import {
  buildAccessibleCustomerAccountsQuery,
  buildCampaignInsightsQuery,
  buildCampaignsQuery,
  parseCampaignsResponse,
  parseCustomerClientsResponse,
  parseInsightsResponse,
  type GaqlSearchResponse,
} from "./gaql";
import type { GoogleAccountOption } from "./gaql";

const REQUIRED_ENV = ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN"] as const;

/**
 * NOT hardcoded on purpose — Google Ads API major versions sunset roughly
 * yearly (see the google-ads-api-mcp-setup / google-ads-api-quickstart
 * skills' own "never hardcode the version" rule). Verified via web search
 * on 2026-09-18 that v25 was current; override with GOOGLE_ADS_API_VERSION
 * in .env if that has changed by the time this runs for real.
 */
const DEFAULT_API_VERSION = "v25";

interface GoogleAdsApiErrorBody {
  error?: { code?: number; message?: string; status?: string };
}

/**
 * Read-only Google Ads adapter using the official REST API directly
 * (OAuth2 token endpoint + googleAds:search) — no gRPC client library, to
 * keep the dependency footprint small. This has NOT been exercised against
 * a live account (no credentials were configured in this session); the
 * query building and response parsing (lib/adapters/google/gaql.ts) are
 * unit-tested against fixtures shaped like Google's documented REST
 * responses, but the HTTP glue below is unverified until real credentials
 * are supplied — see docs/GOOGLE_SETUP.md.
 */
export class GoogleReadAdapter implements AdReadAdapter {
  platform = "GOOGLE" as const;

  private get apiVersion() {
    return process.env.GOOGLE_ADS_API_VERSION?.trim() || DEFAULT_API_VERSION;
  }

  private get developerToken() {
    return process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  }

  missingEnvVars(): string[] {
    return REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
  }

  async getConnectionState(): Promise<ConnectionState> {
    const missing = this.missingEnvVars();
    if (missing.length > 0) {
      return { status: "CONFIG_REQUIRED", detail: `Faltam variáveis: ${missing.join(", ")}. Veja docs/GOOGLE_SETUP.md.` };
    }
    try {
      await this.listAccessibleCustomers();
      return { status: "CONNECTED", detail: "OAuth + developer token validados." };
    } catch (err) {
      const classified = err instanceof Error ? classifyGoogleError("GOOGLE", err.message) : classifyGoogleError("GOOGLE", String(err));
      return { status: "ERROR", detail: classified.message };
    }
  }

  /** `customers:listAccessibleCustomers` — the lightest possible smoke test: validates OAuth + developer token without needing a customer ID yet. */
  async listAccessibleCustomers(): Promise<string[]> {
    const token = await getGoogleAccessToken();
    const res = await fetch(`https://googleads.googleapis.com/${this.apiVersion}/customers:listAccessibleCustomers`, {
      headers: { Authorization: `Bearer ${token}`, "developer-token": this.requireDeveloperToken() },
    });
    const body = await this.parseJsonOrThrow(res);
    const resourceNames = (body as { resourceNames?: string[] }).resourceNames ?? [];
    return resourceNames.map((rn) => rn.replace(/^customers\//, ""));
  }

  /**
   * Lists named accounts under a manager (MCC) account. Requires
   * GOOGLE_ADS_LOGIN_CUSTOMER_ID to be the manager account's ID. If the
   * token isn't tied to an MCC, fall back to listAccessibleCustomers() and
   * present bare IDs — this is what the "selecionar conta" step in
   * Integrações uses.
   */
  async listAccounts(loginCustomerId?: string): Promise<GoogleAccountOption[]> {
    const mcc = (loginCustomerId ?? process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID)?.trim();
    if (!mcc) {
      const ids = await this.listAccessibleCustomers();
      return ids.map((id) => ({ customerId: id, name: id, isManager: false, status: "UNKNOWN" }));
    }
    const response = await this.search(mcc, buildAccessibleCustomerAccountsQuery(), mcc);
    return parseCustomerClientsResponse(response);
  }

  async listCampaigns(customerIdOverride?: string): Promise<AdPlatformCampaign[]> {
    const customerId = this.requireCustomerId(customerIdOverride);
    const response = await this.search(customerId, buildCampaignsQuery());
    return parseCampaignsResponse(response);
  }

  async getInsights(campaignExternalId: string, days: number): Promise<AdPlatformCampaignInsights[]> {
    const customerId = this.requireCustomerId();
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 86_400_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const response = await this.search(customerId, buildCampaignInsightsQuery(campaignExternalId, fmt(start), fmt(end)));
    return parseInsightsResponse(campaignExternalId, response);
  }

  private requireDeveloperToken(): string {
    if (!this.developerToken) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN não configurado.");
    return this.developerToken;
  }

  private requireCustomerId(override?: string): string {
    const customerId = (override ?? process.env.GOOGLE_ADS_CUSTOMER_ID)?.trim().replace(/-/g, "");
    if (!customerId) throw new Error("Nenhum Customer ID selecionado.");
    return customerId;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- shape varies per GAQL query; callers cast to the right row type
  private async search(customerId: string, gaql: string, loginCustomerId?: string): Promise<GaqlSearchResponse<any>> {
    const token = await getGoogleAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "developer-token": this.requireDeveloperToken(),
      "Content-Type": "application/json",
    };
    const login = (loginCustomerId ?? process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID)?.trim();
    if (login) headers["login-customer-id"] = login.replace(/-/g, "");

    const res = await fetch(`https://googleads.googleapis.com/${this.apiVersion}/customers/${customerId}/googleAds:search`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: gaql, pageSize: 10_000 }),
    });
    return this.parseJsonOrThrow(res);
  }

  private async parseJsonOrThrow(res: Response) {
    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { rawResponse: text };
    }
    if (!res.ok) {
      const errBody = body as GoogleAdsApiErrorBody;
      const message = errBody.error?.message ?? `HTTP ${res.status}`;
      throw classifyGoogleError("GOOGLE", message, res.status);
    }
    return body as GaqlSearchResponse<never>;
  }
}

export const googleReadAdapter = new GoogleReadAdapter();
