import { NextResponse } from "next/server";
import { AdApiError, classifyGoogleError, describeAdApiError } from "@/lib/adapters/errors";
import { googleReadAdapter } from "@/lib/adapters/google/read-adapter";
import { upsertIntegration } from "@/lib/integrations";
import { checkCooldown } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const cooldown = checkCooldown("google:test", 3_000);
  if (!cooldown.allowed) {
    return NextResponse.json({ ok: false, error: "Aguarde alguns segundos antes de testar novamente." }, { status: 429 });
  }

  const missing = googleReadAdapter.missingEnvVars();
  if (missing.length > 0) {
    return NextResponse.json({ ok: false, error: `Faltam variáveis: ${missing.join(", ")}.`, kind: "CONFIG" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const loginCustomerId = typeof body?.loginCustomerId === "string" ? body.loginCustomerId.trim() : undefined;

  try {
    await googleReadAdapter.listAccessibleCustomers();
    const accounts = await googleReadAdapter.listAccounts(loginCustomerId);
    await upsertIntegration("GOOGLE", { lastTestedAt: new Date(), lastTestOk: true, loginCustomerId: loginCustomerId || null });
    return NextResponse.json({ ok: true, accounts });
  } catch (err) {
    const classified = err instanceof AdApiError ? err : classifyGoogleError("GOOGLE", err instanceof Error ? err.message : String(err));
    const message = describeAdApiError(classified);
    await upsertIntegration("GOOGLE", { lastTestedAt: new Date(), lastTestOk: false, lastSyncMessage: message });
    return NextResponse.json({ ok: false, error: message, kind: classified.kind }, { status: 400 });
  }
}
