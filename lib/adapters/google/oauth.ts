const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface TokenCache {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let cache: TokenCache | null = null;

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * Exchanges the long-lived refresh token for a short-lived access token via
 * Google's standard OAuth2 token endpoint. Cached in-memory for the token's
 * lifetime (minus a safety margin) so a sync doesn't re-authenticate per
 * request. Never logs or returns the client secret / refresh token.
 */
export async function getGoogleAccessToken(): Promise<string> {
  if (cache && cache.expiresAt > Date.now() + 30_000) {
    return cache.accessToken;
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET e GOOGLE_ADS_REFRESH_TOKEN são obrigatórios.");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = (await res.json()) as GoogleTokenResponse;

  if (!res.ok || !data.access_token) {
    // Never include clientSecret/refreshToken in the thrown message.
    throw new Error(data.error_description || data.error || `OAuth token exchange failed (HTTP ${res.status})`);
  }

  cache = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cache.accessToken;
}

/** Test-only: clears the in-memory token cache. */
export function resetGoogleAccessTokenCache() {
  cache = null;
}
