import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const original = await prisma.draft.findUnique({ where: { id } });
  if (!original) return NextResponse.json({ error: "Não encontrado." }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured to exclude from the create() payload
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = original;
  const copy = await prisma.draft.create({ data: { ...rest, name: `${original.name} (cópia)`, status: "INCOMPLETE" } });
  return NextResponse.json({ draft: copy });
}
