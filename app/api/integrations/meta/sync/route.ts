import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { matchCreatives } from "@/lib/adapters/meta/creative-match";
import { metaReadAdapter } from "@/lib/adapters/meta/read-adapter";
import { getIntegration } from "@/lib/integrations";
import { checkCooldown } from "@/lib/rate-limit";
import { syncPlatformCampaigns } from "@/lib/sync";

const MIN_INTERVAL_MS = 30_000;

export async function POST(req: Request) {
  const cooldown = checkCooldown("meta:sync", MIN_INTERVAL_MS);
  if (!cooldown.allowed) {
    return NextResponse.json(
      { ok: false, error: `Aguarde ${Math.ceil(cooldown.retryAfterMs / 1000)}s antes de sincronizar novamente.` },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const days = Number(body?.days ?? 30);

  const integration = await getIntegration("META");
  if (!integration?.accountId) {
    return NextResponse.json({ ok: false, error: "Nenhuma conta Meta selecionada. Teste a conexão e selecione uma conta primeiro." }, { status: 400 });
  }

  const result = await syncPlatformCampaigns("META", metaReadAdapter, integration.accountId, Math.min(Math.max(days, 1), 90));

  let creativesLinked = 0;
  if (result.ok) {
    try {
      creativesLinked = await linkMetaCreatives(integration.accountId);
    } catch {
      // Best-effort only — a failure here must never fail the metrics sync itself.
    }
  }

  return NextResponse.json({ ...result, creativesLinked });
}

async function linkMetaCreatives(accountId: string): Promise<number> {
  const [external, internal] = await Promise.all([
    metaReadAdapter.listCreatives(accountId),
    prisma.creative.findMany({ where: { externalMetaId: null }, select: { id: true, fileName: true, product: true } }),
  ]);
  const matches = matchCreatives(internal, external);
  for (const m of matches) {
    await prisma.creative.update({ where: { id: m.internalId }, data: { externalMetaId: m.externalId, externalMetaMatchedAt: new Date() } });
  }
  return matches.length;
}
