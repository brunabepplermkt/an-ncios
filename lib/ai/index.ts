import { mockAIProvider } from "./mock-provider";
import type { AIProvider } from "./provider";

/**
 * Single seam for AI. Today only "mock" is implemented. To add a real
 * provider: implement AIProvider (see provider.ts), add a case here, and
 * set AI_PROVIDER=openai|anthropic + the matching API key in .env.
 */
export function getAIProvider(): AIProvider {
  const configured = process.env.AI_PROVIDER ?? "mock";
  switch (configured) {
    case "mock":
    default:
      return mockAIProvider;
  }
}

export type { AIAnalysisResult, AIProvider, AnalysisContext, Recommendation } from "./provider";
