import type { MetaAdCreative } from "./read-adapter";

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/\.[a-z0-9]+$/, "") // strip file extension
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export interface InternalCreativeRef {
  id: string;
  fileName: string;
  product: string | null;
}

export interface CreativeMatch {
  internalId: string;
  externalId: string;
  externalName: string;
}

/**
 * Best-effort, read-only name matching between our creative library and
 * existing Meta ad creatives. Only proposes a match when exactly one
 * external creative's normalized name contains (or is contained by) the
 * internal file's normalized name/product — ambiguous cases (0 or 2+
 * candidates) are skipped rather than guessed. Never fetches or alters
 * the remote asset.
 */
export function matchCreatives(internal: InternalCreativeRef[], external: MetaAdCreative[]): CreativeMatch[] {
  const externalNormalized = external.map((e) => ({ raw: e, norm: normalize(e.name || e.title || "") }));
  const matches: CreativeMatch[] = [];

  for (const int of internal) {
    const candidates = [normalize(int.fileName), int.product ? normalize(int.product) : ""].filter((s) => s.length >= 3);
    if (candidates.length === 0) continue;

    const found = externalNormalized.filter((e) => e.norm.length > 0 && candidates.some((c) => e.norm.includes(c) || c.includes(e.norm)));

    if (found.length === 1) {
      matches.push({ internalId: int.id, externalId: found[0].raw.id, externalName: found[0].raw.name });
    }
  }

  return matches;
}
