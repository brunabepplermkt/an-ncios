import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const drafts = await prisma.draft.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ drafts });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (body.platform !== "META" && body.platform !== "GOOGLE") {
    return NextResponse.json({ error: "platform deve ser META ou GOOGLE." }, { status: 400 });
  }
  const budget = body.budget ? Number(body.budget) : null;
  const draft = await prisma.draft.create({
    data: {
      platform: body.platform,
      name: body.name || "Sem título",
      objective: body.objective || null,
      product: body.product || null,
      budget: budget !== null && Number.isFinite(budget) ? budget : null,
      location: body.location || null,
      audience: body.audience || null,
      landingPage: body.landingPage || null,
      headline: body.headline || null,
      primaryText: body.primaryText || null,
      cta: body.cta || null,
      keywords: JSON.stringify(body.keywords ?? []),
      headlines: JSON.stringify(body.headlines ?? []),
      descriptions: JSON.stringify(body.descriptions ?? []),
      creativeIds: JSON.stringify(body.creativeIds ?? []),
      status: body.status || "INCOMPLETE",
    },
  });
  return NextResponse.json({ draft });
}
