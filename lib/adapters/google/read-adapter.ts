import type { AdPlatformCampaign, AdPlatformCampaignInsights, AdReadAdapter, ConnectionState } from "../types";

const REQUIRED_ENV = [
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_REFRESH_TOKEN",
  "GOOGLE_ADS_CUSTOMER_ID",
] as const;

/**
 * Read-only Google Ads adapter. The preferred future implementation is the
 * official Google Ads API / Google Ads MCP server (see the
 * google-ads-api-mcp-setup and google-ads-api-quickstart skills, and
 * docs/GOOGLE_SETUP.md). No credentials are configured in V1, so this
 * adapter only ever reports connection status or throws — it never
 * fabricates data. Demo data lives in lib/demo and is served separately.
 */
export class GoogleReadAdapter implements AdReadAdapter {
  platform = "GOOGLE" as const;

  private missingEnv(): string[] {
    return REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
  }

  async getConnectionState(): Promise<ConnectionState> {
    const missing = this.missingEnv();
    if (missing.length > 0) {
      return {
        status: "CONFIG_REQUIRED",
        detail: `Faltam variáveis: ${missing.join(", ")}. Veja docs/GOOGLE_SETUP.md.`,
      };
    }
    return {
      status: "CONFIG_REQUIRED",
      detail:
        "Credenciais presentes, mas a chamada real à Google Ads API ainda não foi implementada nesta V1. Use a skill google-ads-api-quickstart para o próximo passo.",
    };
  }

  async listCampaigns(): Promise<AdPlatformCampaign[]> {
    throw new Error(
      "Integração real com Google Ads ainda não implementada nesta V1. Use google-ads-api-mcp-setup / google-ads-api-quickstart amanhã."
    );
  }

  async getInsights(_campaignExternalId: string, _days: number): Promise<AdPlatformCampaignInsights[]> {
    throw new Error("Integração real com Google Ads ainda não implementada nesta V1.");
  }
}

export const googleReadAdapter = new GoogleReadAdapter();
