import { NextResponse } from "next/server";
import { upsertIntegration } from "@/lib/integrations";

export async function POST(req: Request) {
  const body = await req.json();
  const accountId = typeof body?.accountId === "string" ? body.accountId.trim() : "";
  const accountName = typeof body?.accountName === "string" ? body.accountName.trim() : null;

  if (!/^act_\d+$/.test(accountId)) {
    return NextResponse.json({ error: "accountId inválido (esperado formato act_XXXXXXXXX)." }, { status: 400 });
  }

  await upsertIntegration("META", { accountId, accountName });
  return NextResponse.json({ ok: true });
}
