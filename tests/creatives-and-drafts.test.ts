import { describe, expect, it } from "vitest";
import { safeParseTags } from "@/lib/data/creatives";
import { classifyCreativeMime } from "@/lib/creatives/validate";
import { computeDraftStatus } from "@/lib/drafts";

describe("safeParseTags", () => {
  it("parses a JSON array of strings", () => {
    expect(safeParseTags('["a","b"]')).toEqual(["a", "b"]);
  });

  it("returns an empty array for invalid/garbage input instead of throwing", () => {
    expect(safeParseTags("not json")).toEqual([]);
    expect(safeParseTags("{}")).toEqual([]);
    expect(safeParseTags('[1,2,"x"]')).toEqual(["x"]);
  });
});

describe("classifyCreativeMime", () => {
  it("accepts JPG/JPEG/PNG/WEBP as images", () => {
    expect(classifyCreativeMime("image/jpeg")).toBe("IMAGE");
    expect(classifyCreativeMime("image/png")).toBe("IMAGE");
    expect(classifyCreativeMime("image/webp")).toBe("IMAGE");
  });

  it("accepts MP4/MOV as videos", () => {
    expect(classifyCreativeMime("video/mp4")).toBe("VIDEO");
    expect(classifyCreativeMime("video/quicktime")).toBe("VIDEO");
  });

  it("rejects unsupported types", () => {
    expect(classifyCreativeMime("application/pdf")).toBeNull();
    expect(classifyCreativeMime("image/gif")).toBeNull();
  });
});

describe("computeDraftStatus", () => {
  const base = { objective: "", product: "", budget: "", headline: "", primaryText: "", landingPage: "", keywords: "" };

  it("is INCOMPLETE for a Meta draft missing required fields", () => {
    expect(computeDraftStatus({ ...base, platform: "META" })).toBe("INCOMPLETE");
  });

  it("is READY_FOR_REVIEW once all Meta-required fields are filled", () => {
    expect(
      computeDraftStatus({
        ...base,
        platform: "META",
        objective: "Conversões",
        product: "Domo Estelar",
        budget: "100",
        headline: "Título",
        primaryText: "Texto",
      })
    ).toBe("READY_FOR_REVIEW");
  });

  it("uses landingPage/keywords (not headline/primaryText) as required for Google", () => {
    expect(
      computeDraftStatus({
        ...base,
        platform: "GOOGLE",
        objective: "Leads",
        product: "Domo Estelar",
        budget: "50",
        landingPage: "https://example.com",
        keywords: "pousada",
      })
    ).toBe("READY_FOR_REVIEW");
  });
});
