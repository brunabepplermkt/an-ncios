import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { resolveUploadPath } from "@/lib/storage/local-adapter";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  const creative = await prisma.creative.findFirst({ where: { storageKey: key } });
  if (!creative) return new NextResponse("Not found", { status: 404 });

  try {
    const buffer = await readFile(resolveUploadPath(key));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": creative.mimeType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
