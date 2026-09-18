import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCreativeStorageAdapter } from "@/lib/storage";
import { classifyCreativeMime } from "@/lib/creatives/validate";

export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  let metaByIndex: Array<{ width?: number; height?: number; durationSeconds?: number }> = [];
  const metaRaw = form.get("meta");
  if (typeof metaRaw === "string") {
    try {
      metaByIndex = JSON.parse(metaRaw);
    } catch {
      metaByIndex = [];
    }
  }

  const categoryId = (form.get("categoryId") as string) || null;
  const product = (form.get("product") as string) || null;
  const note = (form.get("note") as string) || null;
  const tagsRaw = (form.get("tags") as string) || "";
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const storage = getCreativeStorageAdapter();
  const created = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const mimeType = file.type || "application/octet-stream";
    const kind = classifyCreativeMime(mimeType);
    if (!kind) {
      continue; // skip unsupported type instead of failing the whole batch
    }
    const isImage = kind === "IMAGE";

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storage.save({ buffer, fileName: file.name, mimeType });
    const meta = metaByIndex[i] ?? {};

    const creative = await prisma.creative.create({
      data: {
        fileName: file.name,
        storageKey: stored.key,
        mimeType,
        kind: isImage ? "IMAGE" : "VIDEO",
        sizeBytes: stored.sizeBytes,
        width: meta.width ?? null,
        height: meta.height ?? null,
        durationSeconds: meta.durationSeconds ?? null,
        product,
        tags: JSON.stringify(tags),
        note,
        categoryId,
      },
    });
    created.push(creative);
  }

  if (created.length === 0) {
    return NextResponse.json(
      { error: "Nenhum arquivo com formato suportado (JPG, JPEG, PNG, WEBP, MP4, MOV)." },
      { status: 400 }
    );
  }

  return NextResponse.json({ created: created.length });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { ids, categoryId, tags, product, note } = body as {
    ids: string[];
    categoryId?: string | null;
    tags?: string[];
    product?: string | null;
    note?: string | null;
  };

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "Nenhum criativo selecionado." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (categoryId !== undefined) data.categoryId = categoryId;
  if (product !== undefined) data.product = product;
  if (note !== undefined) data.note = note;
  if (tags !== undefined) data.tags = JSON.stringify(tags);

  await prisma.creative.updateMany({ where: { id: { in: ids } }, data });
  return NextResponse.json({ updated: ids.length });
}
