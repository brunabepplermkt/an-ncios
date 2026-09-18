import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(req: Request) {
  const body = await req.json();
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      businessName: body.businessName,
      currency: body.currency,
      timezone: body.timezone,
    },
    create: {
      id: 1,
      businessName: body.businessName ?? "Meu Negócio",
      currency: body.currency ?? "BRL",
      timezone: body.timezone ?? "America/Sao_Paulo",
    },
  });
  return NextResponse.json({ settings });
}
