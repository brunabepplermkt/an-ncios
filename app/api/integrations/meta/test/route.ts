import { NextResponse } from "next/server";
import { AdApiError, classifyMetaError, describeAdApiError } from "@/lib/adapters/errors";
import { metaReadAdapter } from "@/lib/adapters/meta/read-adapter";
import { upsertIntegration } from "@/lib/integrations";
import { checkCooldown } from "@/lib/rate-limit";

export async function POST() {
  const cooldown = checkCooldown("meta:test", 3_000);
  if (!cooldown.allowed) {
    return NextResponse.json({ ok: false, error: "Aguarde alguns segundos antes de testar novamente." }, { status: 429 });
  }

  if (!metaReadAdapter.isTokenConfigured()) {
    return NextResponse.json({ ok: false, error: "META_ADS_ACCESS_TOKEN não definido no .env.", kind: "CONFIG" }, { status: 400 });
  }

  try {
    const user = await metaReadAdapter.testConnection();
    const accounts = await metaReadAdapter.listAdAccounts();
    await upsertIntegration("META", { lastTestedAt: new Date(), lastTestOk: true });
    return NextResponse.json({
      ok: true,
      user: { name: user.name },
      accounts: accounts.map((a) => ({ id: a.id, accountId: a.accountId, name: a.name, currency: a.currency, timezone: a.timezoneName })),
    });
  } catch (err) {
    const classified = err instanceof AdApiError ? err : classifyMetaError("META", err instanceof Error ? err.message : String(err));
    const message = describeAdApiError(classified);
    await upsertIntegration("META", { lastTestedAt: new Date(), lastTestOk: false, lastSyncMessage: message });
    return NextResponse.json({ ok: false, error: message, kind: classified.kind }, { status: 400 });
  }
}
