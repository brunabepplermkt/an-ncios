import { describe, expect, it } from "vitest";
import { AdApiError, classifyGoogleError, classifyMetaError, describeAdApiError } from "@/lib/adapters/errors";

describe("classifyMetaError", () => {
  it("classifies missing credentials as CONFIG", () => {
    const err = classifyMetaError("META", "No credentials found. Set META_ADS_ACCESS_TOKEN env var");
    expect(err.kind).toBe("CONFIG");
  });

  it("classifies an expired/invalid token as AUTH", () => {
    const err = classifyMetaError("META", "Error validating access token: Session has expired");
    expect(err.kind).toBe("AUTH");
  });

  it("classifies a permission error as PERMISSION", () => {
    const err = classifyMetaError("META", "(#200) The user does not have permission to access this ad account");
    expect(err.kind).toBe("PERMISSION");
  });

  it("classifies a rate-limit message as RATE_LIMIT", () => {
    const err = classifyMetaError("META", "(#17) User request limit reached");
    expect(err.kind).toBe("RATE_LIMIT");
  });

  it("classifies unknown messages as UNKNOWN, not silently as something else", () => {
    const err = classifyMetaError("META", "Something completely unexpected happened");
    expect(err.kind).toBe("UNKNOWN");
  });

  it("is an instance of AdApiError with the platform attached", () => {
    const err = classifyMetaError("META", "boom");
    expect(err).toBeInstanceOf(AdApiError);
    expect(err.platform).toBe("META");
  });
});

describe("classifyGoogleError", () => {
  it("classifies HTTP 401 as AUTH even without a matching keyword", () => {
    const err = classifyGoogleError("GOOGLE", "some opaque error body", 401);
    expect(err.kind).toBe("AUTH");
  });

  it("classifies HTTP 403 / DEVELOPER_TOKEN_NOT_APPROVED as PERMISSION", () => {
    expect(classifyGoogleError("GOOGLE", "developer token not approved", 403).kind).toBe("PERMISSION");
    expect(classifyGoogleError("GOOGLE", "DEVELOPER_TOKEN_NOT_APPROVED").kind).toBe("PERMISSION");
  });

  it("classifies HTTP 429 / RESOURCE_EXHAUSTED as RATE_LIMIT", () => {
    expect(classifyGoogleError("GOOGLE", "too many requests", 429).kind).toBe("RATE_LIMIT");
    expect(classifyGoogleError("GOOGLE", "RESOURCE_EXHAUSTED: quota exceeded").kind).toBe("RATE_LIMIT");
  });
});

describe("describeAdApiError", () => {
  it("never echoes the raw provider message for CONFIG/AUTH (avoids leaking token fragments in error text)", () => {
    const authErr = classifyMetaError("META", "Invalid OAuth access token abc123secret");
    const message = describeAdApiError(authErr);
    expect(message).not.toContain("abc123secret");
  });

  it("does include the raw message for UNKNOWN, since there's nothing sensitive to hide there by definition", () => {
    const err = classifyMetaError("META", "Some genuinely new error");
    expect(describeAdApiError(err)).toContain("Some genuinely new error");
  });
});
