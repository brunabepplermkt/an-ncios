import { NextResponse } from "next/server";
import { googleReadAdapter } from "@/lib/adapters/google/read-adapter";
import { getIntegration } from "@/lib/integrations";
import { checkCooldown } from "@/lib/rate-limit";
import { syncPlatformCampaigns } from "@/lib/sync";

const MIN_INTERVAL_MS = 30_000;

export async function POST(req: Request) {
  const cooldown = checkCooldown("google:sync", MIN_INTERVAL_MS);
  if (!cooldown.allowed) {
    return NextResponse.json(
      { ok: false, error: `Aguarde ${Math.ceil(cooldown.retryAfterMs / 1000)}s antes de sincronizar novamente.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const days = Number(body?.days ?? 30);

  const integration = await getIntegration("GOOGLE");
  if (!integration?.accountId) {
    return NextResponse.json({ ok: false, error: "Nenhum Customer ID selecionado. Teste a conexão e selecione uma conta primeiro." }, { status: 400 });
  }

  const result = await syncPlatformCampaigns("GOOGLE", googleReadAdapter, integration.accountId, Math.min(Math.max(days, 1), 90));
  return NextResponse.json(result);
}
