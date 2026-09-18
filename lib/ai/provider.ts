export interface Recommendation {
  title: string;
  detail: string;
  severity: "info" | "warning" | "critical";
}

export interface AIAnalysisResult {
  answer: string;
  recommendations: Recommendation[];
}

export interface AnalysisContext {
  /** Free text question, e.g. "O que piorou nos últimos 7 dias?" */
  question: string;
  /** Optional platform filter selected in the UI */
  platform?: "META" | "GOOGLE" | "ALL";
  /** Window in days the UI has selected */
  days?: number;
}

/**
 * Analysis layer. Implementations turn app data (campaigns, metrics,
 * creatives) into an answer + recommendations. Never executes anything —
 * every recommendation is advisory only.
 */
export interface AIProvider {
  readonly name: string;
  analyze(ctx: AnalysisContext): Promise<AIAnalysisResult>;
}
