import { prisma } from "@/lib/db";

export type DataMode = "DEMO" | "REAL";

/**
 * A platform is in REAL mode once at least one non-demo campaign has been
 * imported for it (i.e. a successful sync happened). Until then it's DEMO.
 * Demo and real campaigns are never mixed in the same query: callers use
 * this to decide which `isDemo` value to filter on.
 */
export async function getPlatformMode(platform: "META" | "GOOGLE"): Promise<DataMode> {
  const realCount = await prisma.campaign.count({ where: { platform, isDemo: false } });
  return realCount > 0 ? "REAL" : "DEMO";
}

export async function getPlatformModes(): Promise<Record<"META" | "GOOGLE", DataMode>> {
  const [meta, google] = await Promise.all([getPlatformMode("META"), getPlatformMode("GOOGLE")]);
  return { META: meta, GOOGLE: google };
}

/** `isDemo` filter to combine with a platform filter so demo/real are never mixed. */
export function isDemoFilterFor(mode: DataMode): boolean {
  return mode === "DEMO";
}
