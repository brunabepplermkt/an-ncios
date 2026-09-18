import { describe, expect, it } from "vitest";
import { DisabledGoogleWriteAdapter, DisabledMetaWriteAdapter } from "@/lib/adapters/disabled-write-adapter";

describe("disabled write adapters", () => {
  it("never allows publishing, budget changes, or pausing on Meta", async () => {
    expect(DisabledMetaWriteAdapter.enabled).toBe(false);
    await expect(DisabledMetaWriteAdapter.publishCampaign()).rejects.toThrow(/desabilitadas/i);
    await expect(DisabledMetaWriteAdapter.updateBudget()).rejects.toThrow();
    await expect(DisabledMetaWriteAdapter.pauseCampaign()).rejects.toThrow();
  });

  it("never allows publishing, budget changes, or pausing on Google", async () => {
    expect(DisabledGoogleWriteAdapter.enabled).toBe(false);
    await expect(DisabledGoogleWriteAdapter.publishCampaign()).rejects.toThrow();
    await expect(DisabledGoogleWriteAdapter.updateBudget()).rejects.toThrow();
    await expect(DisabledGoogleWriteAdapter.pauseCampaign()).rejects.toThrow();
  });
});
