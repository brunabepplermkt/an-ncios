import { describe, expect, it } from "vitest";
import { matchCreatives } from "@/lib/adapters/meta/creative-match";

describe("matchCreatives", () => {
  it("matches by normalized product name, ignoring accents/case/punctuation", () => {
    const result = matchCreatives(
      [{ id: "int-1", fileName: "domo-estelar-por-do-sol.jpg", product: "Domo Estelar" }],
      [{ id: "ext-1", name: "Domo Estelar — Anúncio Pôr do Sol" }]
    );
    expect(result).toEqual([{ internalId: "int-1", externalId: "ext-1", externalName: "Domo Estelar — Anúncio Pôr do Sol" }]);
  });

  it("matches by file name when there's no product set", () => {
    const result = matchCreatives(
      [{ id: "int-1", fileName: "promocao-fim-de-semana.jpg", product: null }],
      [{ id: "ext-1", name: "promocao fim de semana - v2" }]
    );
    expect(result).toHaveLength(1);
    expect(result[0].internalId).toBe("int-1");
  });

  it("skips ambiguous matches (2+ candidates) instead of guessing", () => {
    const result = matchCreatives(
      [{ id: "int-1", fileName: "promocao.jpg", product: "Promoção" }],
      [
        { id: "ext-1", name: "Promoção Verão" },
        { id: "ext-2", name: "Promoção Inverno" },
      ]
    );
    expect(result).toEqual([]);
  });

  it("does not match when nothing is similar", () => {
    const result = matchCreatives([{ id: "int-1", fileName: "sitio-trilha.jpg", product: "Sítio Vó Deny" }], [{ id: "ext-1", name: "Banner institucional genérico" }]);
    expect(result).toEqual([]);
  });

  it("ignores very short/empty candidates to avoid trivial false positives", () => {
    const result = matchCreatives([{ id: "int-1", fileName: "a.jpg", product: "" }], [{ id: "ext-1", name: "a" }]);
    expect(result).toEqual([]);
  });
});
