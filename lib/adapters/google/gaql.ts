import type { AdPlatformCampaign, AdPlatformCampaignInsights } from "../types";

/**
 * GAQL query builders + response parsers for the Google Ads API REST
 * `:search` endpoint. Kept as pure functions (no fetch/auth here) so the
 * parsing logic can be unit tested against fixture JSON shaped exactly like
 * Google's documented SearchGoogleAdsResponse — without ever calling the
 * real API. See lib/adapters/google/read-adapter.ts for the HTTP glue.
 *
 * Field/casing notes (verified against Google's own REST field-naming
 * convention: GAQL uses snake_case, JSON responses use camelCase):
 * - metrics.cost_micros / conversions_value are NOT in micros for the
 *   *_value fields — only cost_micros and budget amount_micros are micros
 *   (divide by 1,000,000 for currency units).
 * - int64 fields (impressions, clicks, ids) are serialized as JSON strings.
 */

function assertNumericId(id: string, label: string) {
  if (!/^\d+$/.test(id)) throw new Error(`${label} inválido (esperado apenas dígitos): ${id}`);
}

export function buildCampaignsQuery(): string {
  return "SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.amount_micros FROM campaign WHERE campaign.status != 'REMOVED' ORDER BY campaign.id";
}

export function buildCampaignInsightsQuery(campaignId: string, startDate: string, endDate: string): string {
  assertNumericId(campaignId, "campaignId");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new Error("startDate/endDate devem estar em formato YYYY-MM-DD");
  }
  return (
    "SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value " +
    `FROM campaign WHERE campaign.id = ${campaignId} AND segments.date BETWEEN '${startDate}' AND '${endDate}' ORDER BY segments.date`
  );
}

export function buildAccessibleCustomerAccountsQuery(): string {
  return "SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.status, customer_client.currency_code FROM customer_client WHERE customer_client.level <= 1";
}

interface GaqlCampaignRow {
  campaign?: { id?: string; name?: string; status?: string; advertisingChannelType?: string };
  campaignBudget?: { amountMicros?: string };
}

interface GaqlInsightsRow {
  segments?: { date?: string };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: number;
    conversionsValue?: number;
  };
}

interface GaqlCustomerClientRow {
  customerClient?: {
    id?: string;
    descriptiveName?: string;
    manager?: boolean;
    status?: string;
    currencyCode?: string;
  };
}

export interface GaqlSearchResponse<T> {
  results?: T[];
  nextPageToken?: string;
}

export function parseCampaignsResponse(response: GaqlSearchResponse<GaqlCampaignRow>): AdPlatformCampaign[] {
  return (response.results ?? [])
    .filter((r) => r.campaign?.id && r.campaign?.name)
    .map((r) => ({
      externalId: r.campaign!.id!,
      name: r.campaign!.name!,
      status: r.campaign!.status ?? "UNKNOWN",
      objective: r.campaign!.advertisingChannelType,
      dailyBudget: r.campaignBudget?.amountMicros ? Number(r.campaignBudget.amountMicros) / 1_000_000 : undefined,
    }));
}

export function parseInsightsResponse(campaignExternalId: string, response: GaqlSearchResponse<GaqlInsightsRow>): AdPlatformCampaignInsights[] {
  return (response.results ?? [])
    .filter((r) => r.segments?.date)
    .map((r) => ({
      campaignExternalId,
      date: r.segments!.date!,
      impressions: Number(r.metrics?.impressions ?? 0),
      clicks: Number(r.metrics?.clicks ?? 0),
      spend: r.metrics?.costMicros ? Number(r.metrics.costMicros) / 1_000_000 : 0,
      conversions: r.metrics?.conversions ?? 0,
      revenue: r.metrics?.conversionsValue,
    }));
}

export interface GoogleAccountOption {
  customerId: string;
  name: string;
  isManager: boolean;
  status: string;
  currency?: string;
}

export function parseCustomerClientsResponse(response: GaqlSearchResponse<GaqlCustomerClientRow>): GoogleAccountOption[] {
  return (response.results ?? [])
    .filter((r) => r.customerClient?.id)
    .map((r) => ({
      customerId: r.customerClient!.id!,
      name: r.customerClient!.descriptiveName || r.customerClient!.id!,
      isManager: Boolean(r.customerClient!.manager),
      status: r.customerClient!.status ?? "UNKNOWN",
      currency: r.customerClient!.currencyCode,
    }));
}
