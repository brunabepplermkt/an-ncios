import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";

export async function POST(req: Request) {
  const body = await req.json();
  const question = (body?.question as string)?.trim();
  if (!question) {
    return NextResponse.json({ error: "Pergunta vazia." }, { status: 400 });
  }

  const provider = getAIProvider();
  const result = await provider.analyze({
    question,
    platform: body?.platform ?? "ALL",
    days: body?.days ?? 30,
  });

  return NextResponse.json({ provider: provider.name, ...result });
}
