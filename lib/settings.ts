import { prisma } from "@/lib/db";

export async function getSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return (
    settings ??
    (await prisma.settings.create({ data: { id: 1 } }))
  );
}
