export type AdApiErrorKind = "AUTH" | "PERMISSION" | "RATE_LIMIT" | "NOT_FOUND" | "CONFIG" | "UNKNOWN";

/**
 * Normalized error across providers. Classification is a best-effort
 * substring match on the provider's own error message — providers don't
 * give us a stable machine-readable error code through these CLIs/REST
 * calls, so this is a heuristic, not a guarantee.
 */
export class AdApiError extends Error {
  readonly kind: AdApiErrorKind;
  readonly platform: "META" | "GOOGLE";

  constructor(platform: "META" | "GOOGLE", kind: AdApiErrorKind, message: string) {
    super(message);
    this.name = "AdApiError";
    this.kind = kind;
    this.platform = platform;
  }
}

export function classifyMetaError(platform: "META" | "GOOGLE", raw: string): AdApiError {
  const msg = raw.toLowerCase();
  if (msg.includes("no credentials found")) {
    return new AdApiError(platform, "CONFIG", raw);
  }
  if (msg.includes("access token") || msg.includes("oauth") || msg.includes("session has expired") || msg.includes("authenticate")) {
    return new AdApiError(platform, "AUTH", raw);
  }
  if (msg.includes("permission") || msg.includes("does not have permission") || msg.includes("not authorized")) {
    return new AdApiError(platform, "PERMISSION", raw);
  }
  if (msg.includes("request limit") || msg.includes("rate limit") || msg.includes("too many calls") || msg.includes("throttl")) {
    return new AdApiError(platform, "RATE_LIMIT", raw);
  }
  if (msg.includes("does not exist") || msg.includes("not found") || msg.includes("unsupported get request")) {
    return new AdApiError(platform, "NOT_FOUND", raw);
  }
  return new AdApiError(platform, "UNKNOWN", raw);
}

export function classifyGoogleError(platform: "META" | "GOOGLE", raw: string, httpStatus?: number): AdApiError {
  const msg = raw.toLowerCase();
  if (httpStatus === 401 || msg.includes("unauthenticated") || msg.includes("invalid_grant") || msg.includes("invalid token")) {
    return new AdApiError(platform, "AUTH", raw);
  }
  if (httpStatus === 403 || msg.includes("permission_denied") || msg.includes("developer_token_not_approved") || msg.includes("user_permission_denied")) {
    return new AdApiError(platform, "PERMISSION", raw);
  }
  if (httpStatus === 429 || msg.includes("resource_exhausted") || msg.includes("rate") || msg.includes("quota")) {
    return new AdApiError(platform, "RATE_LIMIT", raw);
  }
  if (httpStatus === 404 || msg.includes("not_found")) {
    return new AdApiError(platform, "NOT_FOUND", raw);
  }
  return new AdApiError(platform, "UNKNOWN", raw);
}

/** User-facing (pt-BR) message for a classified error — never includes the raw token/secret. */
export function describeAdApiError(err: AdApiError): string {
  switch (err.kind) {
    case "CONFIG":
      return "Credenciais não configuradas. Preencha o .env e tente novamente.";
    case "AUTH":
      return "Token/credencial inválida ou expirada. Gere um novo token e atualize o .env.";
    case "PERMISSION":
      return "A credencial não tem permissão suficiente para essa ação (escopo/role insuficiente).";
    case "RATE_LIMIT":
      return "Limite de requisições da API atingido. Aguarde alguns minutos e tente novamente.";
    case "NOT_FOUND":
      return "Recurso não encontrado (conta/ID incorreto ou sem acesso).";
    default:
      return `Erro inesperado do provedor: ${err.message}`;
  }
}
