export interface DraftCompleteness {
  platform: "META" | "GOOGLE";
  objective: string;
  product: string;
  budget: string;
  headline: string;
  primaryText: string;
  landingPage: string;
  keywords: string;
}

/** Mirrors the wizard's required fields per platform to decide draft status. */
export function computeDraftStatus(state: DraftCompleteness): "INCOMPLETE" | "READY_FOR_REVIEW" {
  const requiredMeta = [state.objective, state.product, state.budget, state.headline, state.primaryText];
  const requiredGoogle = [state.objective, state.product, state.budget, state.landingPage, state.keywords];
  const required = state.platform === "META" ? requiredMeta : requiredGoogle;
  const filled = required.filter((v) => v.trim().length > 0).length;
  return filled === required.length ? "READY_FOR_REVIEW" : "INCOMPLETE";
}
