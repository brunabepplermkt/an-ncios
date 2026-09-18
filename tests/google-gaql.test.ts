import { describe, expect, it } from "vitest";
import {
  buildCampaignInsightsQuery,
  buildCampaignsQuery,
  parseCampaignsResponse,
  parseCustomerClientsResponse,
  parseInsightsResponse,
} from "@/lib/adapters/google/gaql";

describe("GAQL query builders", () => {
  it("builds a campaigns query excluding REMOVED", () => {
    expect(buildCampaignsQuery()).toContain("campaign.status != 'REMOVED'");
  });

  it("builds an insights query with the exact campaign id and date range", () => {
    const q = buildCampaignInsightsQuery("123456789", "2026-01-01", "2026-01-31");
    expect(q).toContain("campaign.id = 123456789");
    expect(q).toContain("BETWEEN '2026-01-01' AND '2026-01-31'");
  });

  it("rejects a non-numeric campaign id instead of interpolating it unchecked into GAQL", () => {
    expect(() => buildCampaignInsightsQuery("123; DROP TABLE", "2026-01-01", "2026-01-01")).toThrow();
  });

  it("rejects malformed dates", () => {
    expect(() => buildCampaignInsightsQuery("123", "01-01-2026", "2026-01-01")).toThrow();
  });
});

describe("parseCampaignsResponse", () => {
  it("maps Google's documented REST shape to AdPlatformCampaign, converting budget micros to currency units", () => {
    const result = parseCampaignsResponse({
      results: [
        {
          campaign: { id: "111", name: "Campanha Leads", status: "ENABLED", advertisingChannelType: "SEARCH" },
          campaignBudget: { amountMicros: "5000000" },
        },
      ],
    });
    expect(result).toEqual([{ externalId: "111", name: "Campanha Leads", status: "ENABLED", objective: "SEARCH", dailyBudget: 5 }]);
  });

  it("skips rows missing id/name instead of throwing", () => {
    const result = parseCampaignsResponse({ results: [{ campaign: { status: "ENABLED" } }] });
    expect(result).toEqual([]);
  });

  it("handles an empty/undefined results array", () => {
    expect(parseCampaignsResponse({})).toEqual([]);
  });
});

describe("parseInsightsResponse", () => {
  it("converts cost_micros to currency units and passes conversions/conversions_value through as-is (not micros)", () => {
    const result = parseInsightsResponse("111", {
      results: [
        {
          segments: { date: "2026-01-15" },
          metrics: { impressions: "1000", clicks: "50", costMicros: "12340000", conversions: 3, conversionsValue: 150.5 },
        },
      ],
    });
    expect(result).toEqual([
      { campaignExternalId: "111", date: "2026-01-15", impressions: 1000, clicks: 50, spend: 12.34, conversions: 3, revenue: 150.5 },
    ]);
  });

  it("defaults missing metrics to zero/undefined instead of NaN", () => {
    const result = parseInsightsResponse("111", { results: [{ segments: { date: "2026-01-15" } }] });
    expect(result[0]).toEqual({ campaignExternalId: "111", date: "2026-01-15", impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: undefined });
  });
});

describe("parseCustomerClientsResponse", () => {
  it("maps customer_client rows, falling back to the id when descriptiveName is missing", () => {
    const result = parseCustomerClientsResponse({
      results: [
        { customerClient: { id: "1112223333", descriptiveName: "Conta Principal", manager: false, status: "ENABLED", currencyCode: "BRL" } },
        { customerClient: { id: "4445556666", manager: true, status: "ENABLED" } },
      ],
    });
    expect(result[0]).toEqual({ customerId: "1112223333", name: "Conta Principal", isManager: false, status: "ENABLED", currency: "BRL" });
    expect(result[1].name).toBe("4445556666");
    expect(result[1].isManager).toBe(true);
  });
});
