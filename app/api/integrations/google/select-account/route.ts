import { NextResponse } from "next/server";
import { upsertIntegration } from "@/lib/integrations";

export async function POST(req: Request) {
  const body = await req.json();
  const accountId = typeof body?.accountId === "string" ? body.accountId.trim().replace(/-/g, "") : "";
  const accountName = typeof body?.accountName === "string" ? body.accountName.trim() : null;
  const loginCustomerId = typeof body?.loginCustomerId === "string" ? body.loginCustomerId.trim().replace(/-/g, "") : undefined;

  if (!/^\d{10}$/.test(accountId)) {
    return NextResponse.json({ error: "accountId inválido (esperado Customer ID com 10 dígitos)." }, { status: 400 });
  }

  await upsertIntegration("GOOGLE", { accountId, accountName, loginCustomerId: loginCustomerId || undefined });
  return NextResponse.json({ ok: true });
}
