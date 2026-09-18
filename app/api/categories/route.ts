import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
  }
  try {
    const category = await prisma.category.create({ data: { name: name.trim() } });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: "Já existe uma categoria com esse nome." }, { status: 409 });
  }
}
