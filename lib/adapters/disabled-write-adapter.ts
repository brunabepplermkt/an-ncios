import type { AdWriteAdapter } from "./types";

/**
 * Safety rail: no write adapter in this app is allowed to touch a real
 * account in V1. Every mutating method throws immediately.
 *
 * Meta's future write adapter can be implemented later on top of the
 * official Marketing API or the ArmaVita MCP server (analyzed for
 * reference in docs/META_SETUP.md) — but only after explicit
 * authorization and only outside DisabledMetaWriteAdapter.
 */
export function makeDisabledWriteAdapter(platform: "META" | "GOOGLE"): AdWriteAdapter {
  const blocked = (): Promise<never> =>
    Promise.reject(
      new Error(
        `[${platform}] Ações de escrita estão desabilitadas nesta versão. Nenhuma campanha real pode ser criada, alterada, pausada ou excluída por este app.`
      )
    );

  return {
    platform,
    enabled: false,
    publishCampaign: blocked,
    updateBudget: blocked,
    pauseCampaign: blocked,
  };
}

export const DisabledMetaWriteAdapter = makeDisabledWriteAdapter("META");
export const DisabledGoogleWriteAdapter = makeDisabledWriteAdapter("GOOGLE");
