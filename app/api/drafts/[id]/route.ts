import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await prisma.draft.findUnique({ where: { id } });
  if (!draft) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  return NextResponse.json({ draft });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const draft = await prisma.draft.update({
    where: { id },
    data: {
      name: body.name,
      objective: body.objective ?? null,
      product: body.product ?? null,
      budget: body.budget ? Number(body.budget) : null,
      location: body.location ?? null,
      audience: body.audience ?? null,
      landingPage: body.landingPage ?? null,
      headline: body.headline ?? null,
      primaryText: body.primaryText ?? null,
      cta: body.cta ?? null,
      keywords: JSON.stringify(body.keywords ?? []),
      headlines: JSON.stringify(body.headlines ?? []),
      descriptions: JSON.stringify(body.descriptions ?? []),
      creativeIds: JSON.stringify(body.creativeIds ?? []),
      status: body.status,
    },
  });
  return NextResponse.json({ draft });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.draft.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
